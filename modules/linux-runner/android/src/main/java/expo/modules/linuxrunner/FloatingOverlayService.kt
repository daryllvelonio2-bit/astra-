package expo.modules.linuxrunner

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.DisplayMetrics
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

class FloatingOverlayService : Service() {

    companion object {
        const val CHANNEL_ID = "pyxis_floating_overlay_channel"
        const val NOTIFICATION_ID = 9021
        const val EXTRA_WORKSPACE_ID = "workspaceId"
        const val EXTRA_ACTIVE_FILE_NAME = "activeFileName"

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var instance: FloatingOverlayService? = null
            private set

        fun collapseToBubble() {
            instance?.postCollapseToBubble()
        }

        fun expandToWindow() {
            instance?.postExpandToWindow()
        }

        fun stop(context: Context) {
            val intent = Intent(context, FloatingOverlayService::class.java)
            context.stopService(intent)
        }
    }

    private var windowManager: WindowManager? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var bubbleView: BubbleView? = null
    private var bubbleLayoutParams: WindowManager.LayoutParams? = null

    private var trashView: TrashView? = null
    private var trashLayoutParams: WindowManager.LayoutParams? = null

    private var windowContainer: FrameLayout? = null
    private var windowLayoutParams: WindowManager.LayoutParams? = null
    private var overlayWebView: WebView? = null
    private var headerView: View? = null

    // Persistent Size & Position State
    private var savedWindowWidth: Int = 0
    private var savedWindowHeight: Int = 0
    private var savedWindowX: Int = -1
    private var savedWindowY: Int = -1
    private var isCurrentlyInputOnly: Boolean = false
    private var isHtmlLoaded: Boolean = false

    private var currentWorkspaceId: String? = null
    private var currentActiveFileName: String? = null
    private var activeAgentThread: Thread? = null
    private var activeHttpConn: java.net.HttpURLConnection? = null

    private var isExpanded = false
    private var isBubbleAttached = false
    private var isWindowAttached = false
    private var isTrashAttached = false
    private var isAgentRunningInBackground = false

    @Volatile
    private var activePrompt: String? = null
    @Volatile
    private var activeEngine: String? = null
    @Volatile
    private var activeSessionId: String? = null
    private val activeAccumulatedDelta = StringBuilder()
    private val activeStepsJson = JSONArray()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        isRunning = true
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        resolveDefaultWorkspace()
        createNotificationChannel()
        startForegroundServiceCompat()

        initBubbleView()
        initTrashView()
        initWindowView()

        // Start in bubble mode
        showBubble()
    }

    private fun resolveDefaultWorkspace() {
        if (currentWorkspaceId.isNullOrBlank()) {
            val workspacesDir = File(filesDir, "workspaces")
            if (workspacesDir.exists() && workspacesDir.isDirectory) {
                val list = workspacesDir.listFiles { f -> f.isDirectory }
                if (list != null && list.isNotEmpty()) {
                    currentWorkspaceId = list[0].name
                }
            }
        }
    }

    private fun startForegroundServiceCompat() {
        val notification = buildForegroundNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } catch (e: Exception) {
                startForeground(NOTIFICATION_ID, notification)
            }
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            val wsId = intent.getStringExtra(EXTRA_WORKSPACE_ID)
            val fileName = intent.getStringExtra(EXTRA_ACTIVE_FILE_NAME)
            if (wsId != null) currentWorkspaceId = wsId
            if (fileName != null) currentActiveFileName = fileName

            val action = intent.action
            if (action == "ACTION_EXPAND") {
                postExpandToWindow()
            } else if (action == "ACTION_COLLAPSE") {
                postCollapseToBubble()
            } else if (action == "ACTION_CLOSE") {
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // Swiped away: stop agent one-shot commands + provisioning so nothing
        // keeps burning CPU in the background. Interactive PTY shells stay.
        try {
            ProcessExecutor.stopAll()
        } catch (_: Exception) {}
        try {
            EnvironmentManager.cancelProvisioning()
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        instance = null

        stopActiveGeneration()
        removeBubble()
        removeTrash()
        removeWindow()

        mainHandler.post {
            try {
                overlayWebView?.destroy()
            } catch (_: Exception) {}
            overlayWebView = null
        }
    }

    private fun stopActiveGeneration() {
        try {
            activeHttpConn?.disconnect()
            activeHttpConn = null
        } catch (_: Exception) {}
        try {
            activeAgentThread?.interrupt()
            activeAgentThread = null
        } catch (_: Exception) {}
        isAgentRunningInBackground = false
        updateBubbleState()
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            resources.displayMetrics
        ).toInt()
    }

    private fun getScreenMetrics(): DisplayMetrics {
        return resources.displayMetrics
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Astra Floating Chat Head",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Astra AI floating above other apps"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingLaunch = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val closeIntent = Intent(this, FloatingOverlayService::class.java).apply {
            action = "ACTION_CLOSE"
        }
        val pendingClose = PendingIntent.getService(
            this,
            1,
            closeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            Notification.Builder(this)
        }

        builder.setContentTitle("Astra AI Active")
            .setContentText("Tap bubble to vibe-code over other apps")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingLaunch)
            .setOngoing(true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            builder.addAction(
                Notification.Action.Builder(
                    null,
                    "Close Overlay",
                    pendingClose
                ).build()
            )
        }

        return builder.build()
    }

    // ==========================================
    // Bubble Chat Head (System WindowManager)
    // ==========================================
    private fun initBubbleView() {
        val bubbleSize = dpToPx(48f)
        val configFile = File(filesDir, "config.json")
        var selectedTheme = "dark"
        if (configFile.exists()) {
            try {
                val json = JSONObject(configFile.readText())
                selectedTheme = json.optString("selectedTheme", "dark")
            } catch (_: Exception) {}
        }
        bubbleView = BubbleView(this).apply {
            layoutParams = FrameLayout.LayoutParams(bubbleSize, bubbleSize)
            updateTheme(selectedTheme)
        }

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val screen = getScreenMetrics()
        bubbleLayoutParams = WindowManager.LayoutParams(
            bubbleSize,
            bubbleSize,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screen.widthPixels - bubbleSize - dpToPx(12f)
            y = screen.heightPixels / 3
        }

        setupBubbleTouchListener()
    }

    private fun setupBubbleTouchListener() {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var touchStartTime = 0L
        var isDragging = false

        bubbleView?.setOnTouchListener { _, event ->
            val params = bubbleLayoutParams ?: return@setOnTouchListener false
            val screen = getScreenMetrics()
            val bubbleSize = dpToPx(48f)

            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    touchStartTime = System.currentTimeMillis()
                    isDragging = false
                    bubbleView?.setIsPressedState(true)
                    true
                }

                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()

                    if (!isDragging && hypot(dx.toDouble(), dy.toDouble()) > dpToPx(8f)) {
                        isDragging = true
                        showTrash()
                    }

                    if (isDragging) {
                        params.x = initialX + dx
                        params.y = initialY + dy
                        updateBubbleLayout()

                        val trashX = screen.widthPixels / 2
                        val trashY = screen.heightPixels - dpToPx(80f)
                        val distToTrash = hypot(
                            (event.rawX - trashX).toDouble(),
                            (event.rawY - trashY).toDouble()
                        )

                        val isOverTrash = distToTrash < dpToPx(55f)
                        trashView?.setHoveredState(isOverTrash)
                        if (isOverTrash) {
                            vibrateLight()
                        }
                    }
                    true
                }

                MotionEvent.ACTION_UP -> {
                    bubbleView?.setIsPressedState(false)
                    val wasDragging = isDragging
                    val wasOverTrash = trashView?.isHoveredState == true
                    hideTrash()

                    if (wasOverTrash) {
                        vibrateConfirm()
                        stopSelf()
                        return@setOnTouchListener true
                    }

                    val duration = System.currentTimeMillis() - touchStartTime
                    val totalDist = hypot(
                        (event.rawX - initialTouchX).toDouble(),
                        (event.rawY - initialTouchY).toDouble()
                    )

                    if (!wasDragging && duration < 350 && totalDist < dpToPx(14f)) {
                        postExpandToWindow()
                    } else {
                        snapBubbleToEdge(params.x, params.y)
                    }
                    true
                }

                else -> false
            }
        }
    }

    private fun snapBubbleToEdge(currentX: Int, currentY: Int) {
        val screen = getScreenMetrics()
        val bubbleSize = dpToPx(48f)
        val margin = dpToPx(10f)
        val targetX = if (currentX + bubbleSize / 2 < screen.widthPixels / 2) {
            margin
        } else {
            screen.widthPixels - bubbleSize - margin
        }

        val minY = dpToPx(35f)
        val maxY = screen.heightPixels - bubbleSize - dpToPx(50f)
        val clampedY = max(minY, min(maxY, currentY))

        val params = bubbleLayoutParams ?: return
        val animator = ValueAnimator.ofInt(params.x, targetX).apply {
            duration = 240
            interpolator = DecelerateInterpolator()
            addUpdateListener { anim ->
                params.x = anim.animatedValue as Int
                params.y = clampedY
                updateBubbleLayout()
            }
        }
        animator.start()
    }

    fun showBubble() {
        if (!isBubbleAttached && bubbleView != null && bubbleLayoutParams != null) {
            try {
                windowManager?.addView(bubbleView, bubbleLayoutParams)
                isBubbleAttached = true
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        updateBubbleState()
    }

    private fun removeBubble() {
        if (isBubbleAttached && bubbleView != null) {
            try {
                windowManager?.removeView(bubbleView)
            } catch (_: Exception) {}
            isBubbleAttached = false
        }
    }

    private fun updateBubbleLayout() {
        if (isBubbleAttached && bubbleView != null && bubbleLayoutParams != null) {
            try {
                windowManager?.updateViewLayout(bubbleView, bubbleLayoutParams)
            } catch (_: Exception) {}
        }
    }

    private fun updateBubbleState() {
        mainHandler.post {
            bubbleView?.setIsActiveTask(isAgentRunningInBackground)
        }
    }

    // ==========================================
    // Trash / Dismiss Target
    // ==========================================
    private fun initTrashView() {
        val trashSize = dpToPx(56f)
        trashView = TrashView(this).apply {
            layoutParams = FrameLayout.LayoutParams(trashSize, trashSize)
            alpha = 0f
        }

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val screen = getScreenMetrics()
        trashLayoutParams = WindowManager.LayoutParams(
            trashSize,
            trashSize,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = dpToPx(35f)
        }
    }

    private fun showTrash() {
        if (!isTrashAttached && trashView != null && trashLayoutParams != null) {
            try {
                windowManager?.addView(trashView, trashLayoutParams)
                isTrashAttached = true
                trashView?.animate()?.alpha(1f)?.setDuration(150)?.start()
            } catch (_: Exception) {}
        }
    }

    private fun hideTrash() {
        if (isTrashAttached && trashView != null) {
            trashView?.animate()?.alpha(0f)?.setDuration(150)?.withEndAction {
                removeTrash()
            }?.start()
        }
    }

    private fun removeTrash() {
        if (isTrashAttached && trashView != null) {
            try {
                windowManager?.removeView(trashView)
            } catch (_: Exception) {}
            isTrashAttached = false
        }
    }

    // ==========================================
    // Ultra Compact Floating Window
    // ==========================================
    @SuppressLint("SetJavaScriptEnabled")
    private fun initWindowView() {
        val screen = getScreenMetrics()
        if (savedWindowWidth <= 0) {
            savedWindowWidth = min(dpToPx(205f), (screen.widthPixels * 0.54f).toInt())
        }
        if (savedWindowHeight <= 0) {
            savedWindowHeight = min(dpToPx(300f), (screen.heightPixels * 0.44f).toInt())
        }
        if (savedWindowX < 0) {
            savedWindowX = (screen.widthPixels - savedWindowWidth) / 2
        }
        if (savedWindowY < 0) {
            savedWindowY = (screen.heightPixels - savedWindowHeight) / 2
        }

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        windowLayoutParams = WindowManager.LayoutParams(
            savedWindowWidth,
            savedWindowHeight,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = savedWindowX
            y = savedWindowY
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        }

        windowContainer = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                setColor(Color.parseColor("#13161c"))
                cornerRadius = dpToPx(12f).toFloat()
                setStroke(dpToPx(1.2f), Color.parseColor("#2d3342"))
            }
            background = bg
            elevation = dpToPx(10f).toFloat()
            clipToOutline = true

            // Automatically collapse to bubble when tapping outside
            setOnTouchListener { _, event ->
                if (event.action == MotionEvent.ACTION_OUTSIDE) {
                    postCollapseToBubble()
                    true
                } else {
                    false
                }
            }
        }

        val linearLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        headerView = createDraggableMinimalHeader()
        linearLayout.addView(headerView)

        overlayWebView = WebView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f
            )
            setBackgroundColor(Color.parseColor("#13161c"))
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                useWideViewPort = true
                loadWithOverviewMode = true
            }
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    isHtmlLoaded = true
                    if (isCurrentlyInputOnly) {
                        view?.evaluateJavascript("document.body.classList.add('input-only-mode');", null)
                    }
                }
            }
            addJavascriptInterface(PyxisWebBridge(this@FloatingOverlayService), "PyxisNative")
        }

        linearLayout.addView(overlayWebView)
        windowContainer?.addView(linearLayout)

        val resizeGrip = createResizeHandleView()
        windowContainer?.addView(resizeGrip)
    }

    private fun createResizeHandleView(): View {
        val handleSize = dpToPx(32f)
        val handle = ResizeHandleView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                handleSize,
                handleSize,
                Gravity.BOTTOM or Gravity.END
            )
        }

        var startW = 0
        var startH = 0
        var touchStartX = 0f
        var touchStartY = 0f
        var lastIsInputOnly: Boolean? = null

        handle.setOnTouchListener { _, event ->
            val params = windowLayoutParams ?: return@setOnTouchListener false
            val screen = getScreenMetrics()
            val minW = dpToPx(140f)
            val maxW = (screen.widthPixels * 0.95f).toInt()
            val minH = dpToPx(44f)
            val maxH = (screen.heightPixels * 0.85f).toInt()

            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    startW = params.width
                    startH = params.height
                    touchStartX = event.rawX
                    touchStartY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - touchStartX).toInt()
                    val dy = (event.rawY - touchStartY).toInt()
                    val newW = max(minW, min(maxW, startW + dx))
                    val newH = max(minH, min(maxH, startH + dy))

                    if (params.width != newW || params.height != newH) {
                        params.width = newW
                        params.height = newH
                        savedWindowWidth = newW
                        savedWindowHeight = newH

                        if (isWindowAttached && windowContainer != null) {
                            try {
                                windowManager?.updateViewLayout(windowContainer, params)
                            } catch (_: Exception) {}
                        }

                        val isInputOnly = newH <= dpToPx(60f)
                        isCurrentlyInputOnly = isInputOnly
                        if (lastIsInputOnly != isInputOnly) {
                            lastIsInputOnly = isInputOnly
                            if (isInputOnly) {
                                headerView?.visibility = View.GONE
                                overlayWebView?.evaluateJavascript("document.body.classList.add('input-only-mode');", null)
                            } else {
                                headerView?.visibility = View.VISIBLE
                                overlayWebView?.evaluateJavascript("document.body.classList.remove('input-only-mode');", null)
                            }
                        }
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    vibrateLight()
                    true
                }
                else -> true
            }
        }

        return handle
    }

    private fun createDraggableMinimalHeader(): View {
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundColor(Color.parseColor("#181b22"))
            setPadding(dpToPx(8f), dpToPx(4f), dpToPx(8f), dpToPx(4f))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        val titleLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
        }

        val logoBadge = BubbleView(this).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(16f), dpToPx(16f)).apply {
                rightMargin = dpToPx(5f)
            }
            setOnClickListener {
                postCollapseToBubble()
            }
        }
        titleLayout.addView(logoBadge)

        val titleText = TextView(this).apply {
            text = "Astra AI"
            setTextColor(Color.parseColor("#f1f5f9"))
            textSize = 11f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
        titleLayout.addView(titleText)

        val wsBadge = TextView(this).apply {
            text = if (!currentWorkspaceId.isNullOrBlank()) " • $currentWorkspaceId" else ""
            setTextColor(Color.parseColor("#64748b"))
            textSize = 9.5f
        }
        titleLayout.addView(wsBadge)
        header.addView(titleLayout)

        var winStartX = 0
        var winStartY = 0
        var touchDownX = 0f
        var touchDownY = 0f

        header.setOnTouchListener { _, event ->
            val params = windowLayoutParams ?: return@setOnTouchListener false
            val screen = getScreenMetrics()
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    winStartX = params.x
                    winStartY = params.y
                    touchDownX = event.rawX
                    touchDownY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - touchDownX).toInt()
                    val dy = (event.rawY - touchDownY).toInt()
                    params.x = max(0, min(screen.widthPixels - params.width, winStartX + dx))
                    params.y = max(0, min(screen.heightPixels - params.height, winStartY + dy))
                    savedWindowX = params.x
                    savedWindowY = params.y
                    if (isWindowAttached && windowContainer != null) {
                        try {
                            windowManager?.updateViewLayout(windowContainer, params)
                        } catch (_: Exception) {}
                    }
                    true
                }
                else -> true
            }
        }

        return header
    }

    fun postExpandToWindow() {
        if (isExpanded) return
        isExpanded = true

        removeBubble()

        if (!isWindowAttached && windowContainer != null && windowLayoutParams != null) {
            try {
                resolveDefaultWorkspace()
                val screen = getScreenMetrics()
                if (savedWindowWidth <= 0) {
                    savedWindowWidth = min(dpToPx(205f), (screen.widthPixels * 0.54f).toInt())
                }
                if (savedWindowHeight <= 0) {
                    savedWindowHeight = min(dpToPx(300f), (screen.heightPixels * 0.44f).toInt())
                }
                if (savedWindowX < 0) {
                    savedWindowX = (screen.widthPixels - savedWindowWidth) / 2
                }
                if (savedWindowY < 0) {
                    savedWindowY = (screen.heightPixels - savedWindowHeight) / 2
                }

                windowLayoutParams?.apply {
                    width = savedWindowWidth
                    height = savedWindowHeight
                    x = max(0, min(screen.widthPixels - savedWindowWidth, savedWindowX))
                    y = max(0, min(screen.heightPixels - savedWindowHeight, savedWindowY))
                    flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
                }

                if (isCurrentlyInputOnly) {
                    headerView?.visibility = View.GONE
                } else {
                    headerView?.visibility = View.VISIBLE
                }

                windowManager?.addView(windowContainer, windowLayoutParams)
                isWindowAttached = true

                if (!isHtmlLoaded) {
                    loadOverlayHtml()
                } else {
                    val ws = currentWorkspaceId ?: ""
                    val convsJson = JSONObject.quote(getConversationsJson(ws))
                    overlayWebView?.evaluateJavascript("if (window.syncSessionsFromNative) { window.syncSessionsFromNative($convsJson); }", null)

                    if (isAgentRunningInBackground && activeSessionId != null) {
                        val deltaEsc: String
                        val stepsEsc: String
                        synchronized(activeStepsJson) {
                            deltaEsc = JSONObject.quote(activeAccumulatedDelta.toString())
                            stepsEsc = JSONObject.quote(activeStepsJson.toString())
                        }
                        val engineEsc = JSONObject.quote(activeEngine ?: "builtin")
                        val promptEsc = JSONObject.quote(activePrompt ?: "")
                        val sessEsc = JSONObject.quote(activeSessionId ?: "")
                        overlayWebView?.evaluateJavascript(
                            "if (window.restoreActiveAgentState) { window.restoreActiveAgentState($sessEsc, $engineEsc, $promptEsc, $deltaEsc, $stepsEsc); }",
                            null
                        )
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun postCollapseToBubble() {
        if (!isExpanded) return
        isExpanded = false

        removeWindow()
        showBubble()
    }

    private fun removeWindow() {
        if (isWindowAttached && windowContainer != null) {
            try {
                windowManager?.removeView(windowContainer)
            } catch (_: Exception) {}
            isWindowAttached = false
        }
    }

    private fun loadOverlayHtml() {
        val html = buildOverlayHtml()
        overlayWebView?.loadDataWithBaseURL("https://pyxis.local/", html, "text/html", "UTF-8", null)
    }

    private fun buildOverlayHtml(): String {
        val configFile = File(filesDir, "config.json")
        var apiKey = ""
        var selectedModel = "gemini-3.5-flash-lite"
        var selectedTheme = "dark"
        val assistantEngine = "proot"

        if (configFile.exists()) {
            try {
                val json = JSONObject(configFile.readText())
                apiKey = json.optString("apiKey", "")
                selectedModel = json.optString("selectedModel", "gemini-3.5-flash-lite")
                selectedTheme = json.optString("selectedTheme", "dark")
            } catch (_: Exception) {}
        }

        val wsId = currentWorkspaceId ?: ""
        val conversationsJson = getConversationsJson(wsId)

        val bgPrimary = if (selectedTheme == "light") "#ffffff" else if (selectedTheme == "midnight") "#0b0f19" else "#13161c"
        val bgSecondary = if (selectedTheme == "light") "#f8fafc" else if (selectedTheme == "midnight") "#0f172a" else "#161920"
        val bgTertiary = if (selectedTheme == "light") "#f1f5f9" else if (selectedTheme == "midnight") "#1e293b" else "#1f2430"
        val textPrimary = if (selectedTheme == "light") "#0f172a" else "#f1f5f9"
        val textSecondary = if (selectedTheme == "light") "#475569" else "#94a3b8"
        val border = if (selectedTheme == "light") "#e2e8f0" else if (selectedTheme == "midnight") "#1e293b" else "#212631"
        val bubbleAssistant = if (selectedTheme == "light") "#f8fafc" else if (selectedTheme == "midnight") "#0f172a" else "#181b23"
        val bubbleAssistantBorder = if (selectedTheme == "light") "#e2e8f0" else if (selectedTheme == "midnight") "#1e293b" else "#282d3b"

        return """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    body {
      background: $bgPrimary;
      color: $textPrimary;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-size: 10.5px;
    }
    .top-chips {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 6px;
      background: $bgSecondary;
      border-bottom: 1px solid $border;
      overflow-x: auto;
    }
    .chip {
      display: flex;
      align-items: center;
      gap: 3px;
      background: $bgTertiary;
      color: $textSecondary;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .chip-highlight { color: #8ab4f8; }
    .chip-engine { color: #f59e0b; }
    .new-chat-btn {
      margin-left: auto;
      background: #1f2430;
      color: #8ab4f8;
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
    }
    
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      -webkit-overflow-scrolling: touch;
    }
    .msg-user-row {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      gap: 3px;
    }
    .msg-user {
      max-width: 90%;
      padding: 6px 8px;
      border-radius: 10px;
      border-bottom-right-radius: 2px;
      background: #2563eb;
      color: #ffffff;
      font-size: 10.5px;
      line-height: 1.35;
      word-break: break-word;
      user-select: text;
      -webkit-user-select: text;
    }
    .msg-assistant-wrapper {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 100%;
    }
    .assistant-header {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 9.5px;
      font-weight: 700;
      color: #8ab4f8;
    }
    .assistant-header-astra { color: #34d399; }
    .msg-assistant {
      background: $bubbleAssistant;
      color: $textPrimary;
      border: 1px solid $bubbleAssistantBorder;
      border-radius: 10px;
      border-bottom-left-radius: 2px;
      padding: 6px 8px;
      font-size: 10.5px;
      line-height: 1.38;
      word-break: break-word;
      user-select: text;
      -webkit-user-select: text;
    }
    .steps-section {
      margin-bottom: 4px;
      background: $bgSecondary;
      border: 1px solid $border;
      border-radius: 5px;
      overflow: hidden;
    }
    .steps-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 5px;
      background: $bgTertiary;
      font-size: 9.5px;
      font-weight: 600;
      color: #8ab4f8;
      cursor: pointer;
    }
    .steps-list {
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .step-card {
      padding: 3px 5px;
      border-radius: 3px;
      font-size: 9.5px;
      line-height: 1.3;
      background: $bgPrimary;
    }
    .step-thought {
      border-left: 2px solid #fdd663;
      color: $textPrimary;
    }
    .step-tool {
      border-left: 2px solid #38bdf8;
      color: #93c5fd;
      font-family: monospace;
    }
    .empty-state {
      text-align: center;
      padding: 14px 6px;
      color: $textSecondary;
    }
    .empty-title {
      color: $textPrimary;
      font-size: 11.5px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .empty-desc { font-size: 9.5px; line-height: 13px; }

    pre {
      background: $bgSecondary;
      border: 1px solid $border;
      border-radius: 5px;
      margin: 4px 0;
      overflow: hidden;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .code-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: $bgTertiary;
      padding: 2px 5px;
      border-bottom: 1px solid $border;
    }
    .code-lang {
      font-size: 8.5px;
      font-weight: bold;
      color: $textSecondary;
      text-transform: uppercase;
    }
    .code-actions {
      display: flex;
      gap: 3px;
    }
    .code-btn {
      background: $bgTertiary;
      border: 1px solid $border;
      color: #8ab4f8;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 4px;
      border-radius: 3px;
      cursor: pointer;
    }
    .code-btn-run { color: #34d399; }
    .code-btn-apply { color: #fbbf24; }
    .code-body {
      padding: 5px 6px;
      overflow-x: auto;
      font-size: 9.5px;
      color: $textPrimary;
      line-height: 1.35;
      user-select: text;
      -webkit-user-select: text;
    }
    
    .status-bar {
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 3px 6px;
      background: #0f2117;
      border-top: 1px solid #1c3d28;
    }
    .status-left {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 9.5px;
      color: #34d399;
      font-weight: 600;
      flex: 1;
    }
    .status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #34d399;
      animation: pulse 0.8s infinite alternate;
    }
    @keyframes pulse { 0% { opacity: 0.3; } 100% { opacity: 1; } }
    .status-stop-btn {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      color: #f87171;
      font-size: 9px;
      font-weight: bold;
      padding: 1px 4px;
      border-radius: 3px;
      cursor: pointer;
    }
    
    .input-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px;
      padding-right: 32px;
      background: $bgSecondary;
      border-top: 1px solid $border;
    }
    textarea {
      flex: 1;
      min-height: 28px;
      max-height: 65px;
      background: $bgTertiary;
      border: 1px solid $border;
      border-radius: 8px;
      padding: 5px 7px;
      color: $textPrimary;
      font-size: 10.5px;
      resize: none;
      outline: none;
      user-select: text;
      -webkit-user-select: text;
    }
    .send-btn {
      width: 26px;
      height: 26px;
      border-radius: 13px;
      background: #2563eb;
      border: none;
      color: #ffffff;
      font-size: 13px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    /* INPUT-ONLY MODE */
    body.input-only-mode .top-chips,
    body.input-only-mode .messages-container,
    body.input-only-mode .status-bar,
    body.input-only-mode .modal-overlay {
      display: none !important;
    }
    body.input-only-mode .input-bar {
      height: 100vh;
      border-top: none;
      padding: 3px 6px;
      padding-right: 32px;
    }
    
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }
    .modal-card {
      width: 100%;
      max-width: 260px;
      background: #181a20;
      border: 1px solid #2d3342;
      border-radius: 10px;
      padding: 10px;
      max-height: 80vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .modal-title { font-size: 11px; font-weight: 700; color: #f1f5f9; }
    .modal-close-btn { color: #94a3b8; font-size: 13px; cursor: pointer; }
    .modal-item {
      padding: 6px 8px;
      background: #1f2430;
      border-radius: 6px;
      margin-bottom: 4px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-item-active { border: 1px solid #8ab4f8; background: #1c2738; }
    .modal-item-title { font-size: 10.5px; font-weight: 600; color: #f8fafc; }
    .modal-item-desc { font-size: 9px; color: #94a3b8; margin-top: 1px; }
  </style>
</head>
<body>
  <div class="top-chips">
    <div class="chip" onclick="openModelPicker()">
      <span class="chip-highlight" id="modelLabel">$selectedModel</span>
    </div>
    <div class="chip">
      <span class="chip-engine" id="engineLabel">Astra CLI</span>
    </div>
    <div class="chip" onclick="openSessionsModal()">
      <span>History</span>
    </div>
    <div class="new-chat-btn" onclick="newChat()">+</div>
  </div>

  <div class="messages-container" id="messagesContainer">
    <div class="empty-state" id="emptyState">
      <div class="empty-title">Astra Vibe Coder</div>
      <div class="empty-desc">Runs in background even when closed. Drag corner to resize!</div>
    </div>
  </div>

  <!-- Live Agent Status Bar -->
  <div class="status-bar" id="statusBar">
    <div class="status-left">
      <div class="status-dot"></div>
      <span id="statusText">Formulating code...</span>
    </div>
    <button class="status-stop-btn" onclick="handleStop()">Stop</button>
  </div>

  <div class="input-bar">
    <textarea id="promptInput" placeholder="Ask Astra..." rows="1"></textarea>
    <button class="send-btn" id="sendBtn" onclick="handleSend()">↑</button>
  </div>

  <!-- Model Picker Modal -->
  <div class="modal-overlay" id="modelModal" onclick="closeModals(event)">
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-title">Select AI Model</div>
        <div class="modal-close-btn" onclick="document.getElementById('modelModal').style.display='none'">✕</div>
      </div>
      <div class="modal-item" onclick="selectModel('gemini-3.5-flash-lite')">
        <div>
          <div class="modal-item-title">Gemini 3.5 Flash Lite</div>
          <div class="modal-item-desc">Default ultra-fast & compact</div>
        </div>
      </div>
      <div class="modal-item" onclick="selectModel('gemini-3.5-flash')">
        <div>
          <div class="modal-item-title">Gemini 3.5 Flash</div>
          <div class="modal-item-desc">High speed reasoning</div>
        </div>
      </div>
      <div class="modal-item" onclick="selectModel('gemini-3.6-flash')">
        <div>
          <div class="modal-item-title">Gemini 3.6 Flash</div>
          <div class="modal-item-desc">Agentic intelligence</div>
        </div>
      </div>
      <div class="modal-item" onclick="selectModel('gemini-pro-latest')">
        <div>
          <div class="modal-item-title">Gemini Pro Latest</div>
          <div class="modal-item-desc">Complex coding</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Sessions Modal -->
  <div class="modal-overlay" id="sessionsModal" onclick="closeModals(event)">
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-title">Conversation History</div>
        <div class="modal-close-btn" onclick="document.getElementById('sessionsModal').style.display='none'">✕</div>
      </div>
      <div id="sessionsList"></div>
    </div>
  </div>

  <!-- Sandbox Result Modal -->
  <div class="modal-overlay" id="resultModal" onclick="closeModals(event)">
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-title">▶️ Sandbox Result</div>
        <div class="modal-close-btn" onclick="document.getElementById('resultModal').style.display='none'">✕</div>
      </div>
      <pre style="max-height:180px;overflow-y:auto;padding:6px" id="resultOutput"></pre>
    </div>
  </div>

  <script>
    let apiKey = "$apiKey";
    let selectedModel = "$selectedModel";
    let assistantEngine = "$assistantEngine";
    let currentWorkspaceId = "$wsId";
    let isGenerating = false;
    let sessions = $conversationsJson;
    let currentSession = null;
    let messages = [];

    const promptInput = document.getElementById("promptInput");
    const messagesContainer = document.getElementById("messagesContainer");
    const emptyState = document.getElementById("emptyState");
    const statusBar = document.getElementById("statusBar");
    const statusText = document.getElementById("statusText");

    // Load initial active session
    if (sessions && sessions.length > 0) {
      loadSessionObj(sessions[0]);
    }

    window.syncSessionsFromNative = function(jsonStr) {
      try {
        const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (parsed && Array.isArray(parsed)) {
          sessions = parsed;
          if (sessions.length > 0) {
            const match = currentSession ? sessions.find(s => s.id === currentSession.id) : null;
            if (match) {
              if (isGenerating && currentSession && currentSession.id === match.id) {
                currentSession = match;
              } else {
                loadSessionObj(match);
              }
            } else if (!isGenerating) {
              loadSessionObj(sessions[0]);
            }
          }
        }
      } catch (e) {}
    };

    window.restoreActiveAgentState = function(sessId, engine, promptText, deltaText, stepsJsonStr) {
      isGenerating = true;
      const isAstra = engine === "proot";
      statusBar.style.display = "flex";
      statusText.innerText = isAstra ? "Astra PRoot executing..." : "Generating...";

      if (emptyState.style.display !== "none") emptyState.style.display = "none";

      const userMsgRows = messagesContainer.querySelectorAll(".msg-user-row");
      let lastUserMsg = userMsgRows.length > 0 ? userMsgRows[userMsgRows.length - 1] : null;
      if (!lastUserMsg || (promptText && !lastUserMsg.innerText.includes(promptText.slice(0, 20)))) {
        if (promptText) {
          const userRow = document.createElement("div");
          userRow.className = "msg-user-row";
          userRow.innerHTML = '<div class="msg-user">' + formatMarkdown(promptText) + '</div>';
          messagesContainer.appendChild(userRow);
        }
      }

      let active = document.getElementById("activeAssistantMsg");
      if (!active) {
        const asstWrap = document.createElement("div");
        asstWrap.className = "msg-assistant-wrapper";
        asstWrap.innerHTML = '<div class="assistant-header ' + (isAstra ? 'assistant-header-astra' : '') + '">' +
          (isAstra ? '🐧 Astra CLI' : '✨ Astra AI') + '</div>' +
          '<div class="msg-assistant" id="activeAssistantMsg"><i>Thinking...</i></div>';
        messagesContainer.appendChild(asstWrap);
        active = document.getElementById("activeAssistantMsg");
      }

      try {
        const steps = typeof stepsJsonStr === 'string' ? JSON.parse(stepsJsonStr) : stepsJsonStr;
        if (steps && Array.isArray(steps) && steps.length > 0) {
          let stepsSection = active.parentElement.querySelector(".steps-section");
          if (!stepsSection) {
            stepsSection = document.createElement("div");
            stepsSection.className = "steps-section";
            stepsSection.innerHTML = '<div class="steps-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === \'none\' ? \'flex\' : \'none\'">' +
              '<span>💡 Steps</span><span>▾</span></div>' +
              '<div class="steps-list"></div>';
            active.parentElement.insertBefore(stepsSection, active);
          }
          const list = stepsSection.querySelector(".steps-list");
          list.innerHTML = '';
          steps.forEach(s => {
            const stepDiv = document.createElement("div");
            stepDiv.className = "step-card " + (s.type === "thought" ? "step-thought" : "step-tool");
            stepDiv.innerText = (s.type === "thought" ? "💡 " : "⚙️ ") + s.text;
            list.appendChild(stepDiv);
          });
        }
      } catch (e) {}

      if (deltaText && deltaText.trim().length > 0) {
        active.setAttribute("data-raw", deltaText);
        active.innerHTML = formatMarkdown(deltaText);
      }

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    promptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    function openModelPicker() {
      document.getElementById("modelModal").style.display = "flex";
    }

    function openSessionsModal() {
      const container = document.getElementById("sessionsList");
      container.innerHTML = '';
      if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div style="color:#64748b;font-size:10px">No previous sessions</div>';
      } else {
        sessions.forEach(sess => {
          const div = document.createElement("div");
          div.className = "modal-item " + (currentSession && currentSession.id === sess.id ? "modal-item-active" : "");
          div.innerHTML = '<div><div class="modal-item-title">' + escapeHtml(sess.title || "New Chat") + '</div>' +
            '<div class="modal-item-desc">' + new Date(sess.updatedAt || sess.createdAt).toLocaleTimeString() + ' • ' + (sess.messages ? sess.messages.length : 0) + ' msgs</div></div>' +
            '<div style="color:#f87171;font-size:10px" onclick="deleteSession(event, \'' + sess.id + '\')">🗑️</div>';
          div.onclick = (e) => {
            if (e.target.innerText === '🗑️') return;
            loadSessionObj(sess);
            document.getElementById("sessionsModal").style.display = "none";
          };
          container.appendChild(div);
        });
      }
      document.getElementById("sessionsModal").style.display = "flex";
    }

    function closeModals(e) {
      if (e.target.classList.contains("modal-overlay")) {
        e.target.style.display = "none";
      }
    }

    function selectModel(model) {
      selectedModel = model;
      document.getElementById("modelLabel").innerText = model.replace("gemini-", "").replace("-flash-lite", " Lite").replace("-flash", " Flash");
      document.getElementById("modelModal").style.display = "none";
    }

    function loadSessionObj(sess) {
      currentSession = sess;
      messages = sess.messages || [];
      renderAllMessages();
    }

    function deleteSession(e, sessId) {
      e.stopPropagation();
      sessions = sessions.filter(s => s.id !== sessId);
      if (currentSession && currentSession.id === sessId) {
        if (sessions.length > 0) loadSessionObj(sessions[0]);
        else newChat();
      } else {
        openSessionsModal();
      }
      if (window.PyxisNative) {
        window.PyxisNative.deleteSession(currentWorkspaceId, sessId);
      }
    }

    function renderAllMessages() {
      messagesContainer.innerHTML = '';
      if (messages.length === 0) {
        messagesContainer.appendChild(emptyState);
        emptyState.style.display = "block";
      } else {
        emptyState.style.display = "none";
        messages.forEach(m => {
          if (m.role === "user") {
            const row = document.createElement("div");
            row.className = "msg-user-row";
            row.innerHTML = '<div class="msg-user">' + formatMarkdown(m.text || "") + '</div>';
            messagesContainer.appendChild(row);
          } else {
            const wrap = document.createElement("div");
            wrap.className = "msg-assistant-wrapper";
            const isAstra = m.engine === "proot";
            wrap.innerHTML = '<div class="assistant-header ' + (isAstra ? 'assistant-header-astra' : '') + '">' +
              (isAstra ? '🐧 Astra CLI' : '✨ Astra AI') + '</div>' +
              '<div class="msg-assistant">' + formatMarkdown(m.text || "") + '</div>';
            messagesContainer.appendChild(wrap);
          }
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }

    function newChat() {
      const now = Date.now();
      const newSess = {
        id: "session-" + now + "-" + Math.random().toString(36).substr(2, 4),
        workspaceId: currentWorkspaceId,
        title: "New Chat",
        createdAt: now,
        updatedAt: now,
        messages: []
      };
      if (!sessions) sessions = [];
      sessions.unshift(newSess);
      loadSessionObj(newSess);
    }

    function escapeHtml(str) {
      return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function formatMarkdown(text) {
      if (!text) return "";
      let html = escapeHtml(text);
      html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function(match, lang, code) {
        const langName = lang || "CODE";
        const b64 = btoa(unescape(encodeURIComponent(code)));
        return '<pre><div class="code-top-bar">' +
          '<span class="code-lang">' + langName + '</span>' +
          '<div class="code-actions">' +
          '<button class="code-btn" onclick="copySnippet(\'' + b64 + '\', this)">Copy</button>' +
          '<button class="code-btn code-btn-run" onclick="runSnippet(\'' + b64 + '\')">▶</button>' +
          '<button class="code-btn code-btn-apply" onclick="applySnippet(\'' + b64 + '\')">⚡</button>' +
          '</div></div>' +
          '<div class="code-body"><code>' + code + '</code></div></pre>';
      });
      html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      html = html.replace(/`([^`]+)`/g, '<code style="background:#222631;padding:1px 3px;border-radius:2px;color:#93c5fd">$1</code>');
      return html.replace(/\n/g, '<br>');
    }

    function copySnippet(base64Code, btn) {
      try {
        const code = decodeURIComponent(escape(atob(base64Code)));
        if (window.PyxisNative) {
          window.PyxisNative.copyToClipboard(code);
          if (btn) {
            const orig = btn.innerText;
            btn.innerText = "✓";
            setTimeout(() => btn.innerText = orig, 1500);
          }
        }
      } catch (e) {}
    }

    function runSnippet(base64Code) {
      try {
        const code = decodeURIComponent(escape(atob(base64Code)));
        if (window.PyxisNative) {
          window.PyxisNative.executeCommand(code);
        }
      } catch (e) {}
    }

    function applySnippet(base64Code) {
      try {
        const code = decodeURIComponent(escape(atob(base64Code)));
        const filePath = prompt("Save code to file:", "index.js");
        if (filePath && window.PyxisNative) {
          window.PyxisNative.applyCodeToFile(filePath, code);
        }
      } catch (e) {}
    }

    function handleStop() {
      if (window.PyxisNative) {
        window.PyxisNative.stopAgent();
      }
      isGenerating = false;
      statusBar.style.display = "none";
    }

    async function handleSend() {
      const text = promptInput.value.trim();
      if (!text || isGenerating) return;

      promptInput.value = "";
      if (emptyState.style.display !== "none") emptyState.style.display = "none";

      if (!currentSession) {
        newChat();
      }

      const userMsg = { id: Date.now().toString(), role: "user", text, timestamp: Date.now() };
      messages.push(userMsg);

      const userRow = document.createElement("div");
      userRow.className = "msg-user-row";
      userRow.innerHTML = '<div class="msg-user">' + formatMarkdown(text) + '</div>';
      messagesContainer.appendChild(userRow);

      const asstWrap = document.createElement("div");
      asstWrap.className = "msg-assistant-wrapper";
      const isAstra = assistantEngine === "proot";
      asstWrap.innerHTML = '<div class="assistant-header ' + (isAstra ? 'assistant-header-astra' : '') + '">' +
        (isAstra ? '🐧 Astra CLI' : '✨ Astra AI') + '</div>' +
        '<div class="msg-assistant" id="activeAssistantMsg"><i>Thinking...</i></div>';
      messagesContainer.appendChild(asstWrap);

      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      isGenerating = true;
      statusBar.style.display = "flex";
      statusText.innerText = isAstra ? "Astra PRoot executing..." : "Generating...";

      try {
        if (window.PyxisNative) {
          const sessId = currentSession ? currentSession.id : ("session-" + Date.now());
          window.PyxisNative.streamQuery(text, selectedModel, assistantEngine, sessId, currentWorkspaceId);
        }
      } catch (e) {
        document.getElementById("activeAssistantMsg").innerText = "Error: " + e.message;
        isGenerating = false;
        statusBar.style.display = "none";
      }
    }

    window.onAgentDelta = function(delta) {
      let active = document.getElementById("activeAssistantMsg");
      if (!active) {
        const asstWrap = document.createElement("div");
        asstWrap.className = "msg-assistant-wrapper";
        const isAstra = assistantEngine === "proot";
        asstWrap.innerHTML = '<div class="assistant-header ' + (isAstra ? 'assistant-header-astra' : '') + '">' +
          (isAstra ? '🐧 Astra CLI' : '✨ Astra AI') + '</div>' +
          '<div class="msg-assistant" id="activeAssistantMsg"></div>';
        messagesContainer.appendChild(asstWrap);
        active = document.getElementById("activeAssistantMsg");
        isGenerating = true;
        statusBar.style.display = "flex";
        statusText.innerText = isAstra ? "Astra PRoot executing..." : "Generating...";
      }
      if (active.getAttribute("data-raw") == null) {
        active.setAttribute("data-raw", "");
      }
      const current = active.getAttribute("data-raw") + delta;
      active.setAttribute("data-raw", current);
      active.innerHTML = formatMarkdown(current);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    window.onAgentStep = function(type, text) {
      let active = document.getElementById("activeAssistantMsg");
      if (!active) {
        const asstWrap = document.createElement("div");
        asstWrap.className = "msg-assistant-wrapper";
        const isAstra = assistantEngine === "proot";
        asstWrap.innerHTML = '<div class="assistant-header ' + (isAstra ? 'assistant-header-astra' : '') + '">' +
          (isAstra ? '🐧 Astra CLI' : '✨ Astra AI') + '</div>' +
          '<div class="msg-assistant" id="activeAssistantMsg"><i>Thinking...</i></div>';
        messagesContainer.appendChild(asstWrap);
        active = document.getElementById("activeAssistantMsg");
        isGenerating = true;
        statusBar.style.display = "flex";
        statusText.innerText = isAstra ? "Astra PRoot executing..." : "Generating...";
      }
      let stepsSection = active.parentElement.querySelector(".steps-section");
      if (!stepsSection) {
        stepsSection = document.createElement("div");
        stepsSection.className = "steps-section";
        stepsSection.innerHTML = '<div class="steps-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === \'none\' ? \'flex\' : \'none\'">' +
          '<span>💡 Steps</span><span>▾</span></div>' +
          '<div class="steps-list"></div>';
        active.parentElement.insertBefore(stepsSection, active);
      }
      const list = stepsSection.querySelector(".steps-list");
      const stepDiv = document.createElement("div");
      stepDiv.className = "step-card " + (type === "thought" ? "step-thought" : "step-tool");
      stepDiv.innerText = (type === "thought" ? "💡 " : "⚙️ ") + text;
      list.appendChild(stepDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    window.onAgentComplete = function(fullReply) {
      isGenerating = false;
      statusBar.style.display = "none";

      let active = document.getElementById("activeAssistantMsg");
      if (!active) {
        const asstWrap = document.createElement("div");
        asstWrap.className = "msg-assistant-wrapper";
        const isAstra = assistantEngine === "proot";
        asstWrap.innerHTML = '<div class="assistant-header ' + (isAstra ? 'assistant-header-astra' : '') + '">' +
          (isAstra ? '🐧 Astra CLI' : '✨ Astra AI') + '</div>' +
          '<div class="msg-assistant" id="activeAssistantMsg"></div>';
        messagesContainer.appendChild(asstWrap);
        active = document.getElementById("activeAssistantMsg");
      }

      active.removeAttribute("id");
      active.setAttribute("data-raw", fullReply);
      active.innerHTML = formatMarkdown(fullReply);

      const asstMsg = {
        id: Date.now().toString(),
        role: "assistant",
        text: fullReply,
        engine: assistantEngine,
        timestamp: Date.now(),
        status: "done"
      };
      messages.push(asstMsg);

      if (currentSession) {
        currentSession.messages = messages;
        currentSession.updatedAt = Date.now();
        if (messages.length <= 3 && (currentSession.title === "New Chat" || !currentSession.title)) {
          currentSession.title = messages[0].text.slice(0, 25);
        }
      }
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    window.onAgentError = function(err) {
      isGenerating = false;
      statusBar.style.display = "none";

      let active = document.getElementById("activeAssistantMsg");
      if (active) {
        active.removeAttribute("id");
        active.innerHTML = '<span style="color:#f87171"><b>Error:</b> ' + escapeHtml(err) + '</span>';
      }
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    window.onExecutionResult = function(stdout, stderr, exitCode) {
      const modal = document.getElementById("resultModal");
      const out = document.getElementById("resultOutput");
      out.innerText = (exitCode === 0 ? "✅ Exit 0\n\n" : "⚠️ Exit " + exitCode + "\n\n") + stdout + (stderr ? "\n\n[Stderr]\n" + stderr : "");
      modal.style.display = "flex";
    };
  </script>
</body>
</html>
        """.trimIndent()
    }

    private fun getConversationFile(workspaceId: String): File {
        val safeWs = if (workspaceId.isNotBlank()) workspaceId.replace(Regex("[^a-zA-Z0-9_-]"), "_") else "default"
        val convDir = File(filesDir, "conversations")
        if (!convDir.exists()) convDir.mkdirs()
        return File(convDir, "$safeWs.json")
    }

    private fun getConversationsJson(workspaceId: String): String {
        if (workspaceId.isBlank()) return "[]"
        val safeWs = workspaceId.replace(Regex("[^a-zA-Z0-9_-]"), "_")
        val file = getConversationFile(workspaceId)
        val legacyDir = File(filesDir, "workspaces/$workspaceId/.ai")
        val legacyFile = File(legacyDir, "conversations.json")

        // Migrate legacy workspace conversations if needed
        if (legacyFile.exists()) {
            try {
                if (!file.exists()) {
                    legacyFile.copyTo(file, overwrite = true)
                }
                legacyDir.deleteRecursively()
            } catch (_: Exception) {}
        }

        if (file.exists()) {
            try {
                return file.readText()
            } catch (_: Exception) {}
        }
        return "[]"
    }

    // Direct background session persistence in Kotlin
    private fun saveMessageToDisk(workspaceId: String, sessionId: String, role: String, text: String, engine: String) {
        try {
            val ws = if (workspaceId.isNotBlank()) workspaceId else (currentWorkspaceId ?: return)
            val file = getConversationFile(ws)

            val sessionsArray = if (file.exists()) {
                try { JSONArray(file.readText()) } catch (_: Exception) { JSONArray() }
            } else {
                JSONArray()
            }

            val msgObj = JSONObject().apply {
                put("id", System.currentTimeMillis().toString())
                put("role", role)
                put("text", text)
                put("timestamp", System.currentTimeMillis())
                if (role == "assistant") {
                    put("engine", engine)
                    put("status", "done")
                }
            }

            var found = false
            for (i in 0 until sessionsArray.length()) {
                val sess = sessionsArray.getJSONObject(i)
                if (sess.optString("id") == sessionId) {
                    val msgs = sess.optJSONArray("messages") ?: JSONArray()
                    msgs.put(msgObj)
                    sess.put("messages", msgs)
                    sess.put("updatedAt", System.currentTimeMillis())
                    if (role == "user" && (sess.optString("title") == "New Chat" || sess.optString("title").isBlank())) {
                        sess.put("title", text.take(30))
                    }
                    found = true
                    break
                }
            }

            if (!found) {
                val newObj = JSONObject().apply {
                    put("id", sessionId)
                    put("workspaceId", ws)
                    put("title", if (role == "user") text.take(30) else "New Chat")
                    put("createdAt", System.currentTimeMillis())
                    put("updatedAt", System.currentTimeMillis())
                    put("messages", JSONArray().apply { put(msgObj) })
                }
                sessionsArray.put(0, newObj)
            }

            file.writeText(sessionsArray.toString(2))
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun vibrateLight() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK))
            } else {
                @Suppress("DEPRECATION")
                val v = getSystemService(VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v?.vibrate(VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    v?.vibrate(15)
                }
            }
        } catch (_: Exception) {}
    }

    private fun vibrateConfirm() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK))
            } else {
                @Suppress("DEPRECATION")
                val v = getSystemService(VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v?.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    v?.vibrate(35)
                }
            }
        } catch (_: Exception) {}
    }

    // ==========================================
    // JavaScript Bridge for Overlay
    // ==========================================
    class PyxisWebBridge(private val service: FloatingOverlayService) {

        @JavascriptInterface
        fun copyToClipboard(text: String) {
            val clipboard = service.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
            val clip = ClipData.newPlainText("Copied Code", text)
            clipboard?.setPrimaryClip(clip)
            service.vibrateLight()
        }

        @JavascriptInterface
        fun deleteSession(workspaceId: String, sessionId: String) {
            Thread {
                try {
                    val ws = if (workspaceId.isNotBlank()) workspaceId else (service.currentWorkspaceId ?: return@Thread)
                    val file = service.getConversationFile(ws)
                    if (file.exists()) {
                        val arr = JSONArray(file.readText())
                        val newArr = JSONArray()
                        for (i in 0 until arr.length()) {
                            val obj = arr.getJSONObject(i)
                            if (obj.optString("id") != sessionId) {
                                newArr.put(obj)
                            }
                        }
                        file.writeText(newArr.toString(2))
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }.start()
        }

        @JavascriptInterface
        fun applyCodeToFile(filePath: String, code: String) {
            Thread {
                try {
                    val ws = service.currentWorkspaceId ?: "default"
                    val wsDir = File(service.filesDir, "workspaces/$ws")
                    if (!wsDir.exists()) wsDir.mkdirs()

                    val targetFile = File(wsDir, filePath)
                    targetFile.parentFile?.mkdirs()
                    targetFile.writeText(code)

                    service.mainHandler.post {
                        service.overlayWebView?.evaluateJavascript("alert('Saved to $filePath');", null)
                    }
                    service.vibrateConfirm()
                } catch (e: Exception) {
                    service.mainHandler.post {
                        service.overlayWebView?.evaluateJavascript("alert('Error: ${e.message}');", null)
                    }
                }
            }.start()
        }

        @JavascriptInterface
        fun executeCommand(command: String) {
            Thread {
                try {
                    EnvironmentManager.initialize(service)
                    val result = ProcessExecutor.execute(service, command, service.currentWorkspaceId, 0)
                    service.mainHandler.post {
                        val outEsc = JSONObject.quote(result.stdout)
                        service.overlayWebView?.evaluateJavascript("window.onExecutionResult($outEsc, '', ${result.exitCode});", null)
                    }
                } catch (e: Exception) {
                    service.mainHandler.post {
                        val errEsc = JSONObject.quote(e.message ?: "Failed")
                        service.overlayWebView?.evaluateJavascript("window.onExecutionResult('', $errEsc, -1);", null)
                    }
                }
            }.start()
        }

        @JavascriptInterface
        fun stopAgent() {
            service.stopActiveGeneration()
        }

        @JavascriptInterface
        fun streamQuery(prompt: String, model: String, engine: String, sessionId: String, workspaceId: String) {
            service.stopActiveGeneration()
            service.isAgentRunningInBackground = true
            service.activePrompt = prompt
            service.activeEngine = engine
            service.activeSessionId = sessionId
            synchronized(service.activeStepsJson) {
                service.activeAccumulatedDelta.setLength(0)
                while (service.activeStepsJson.length() > 0) {
                    service.activeStepsJson.remove(0)
                }
            }
            service.updateBubbleState()

            val ws = if (workspaceId.isNotBlank()) workspaceId else (service.currentWorkspaceId ?: "")

            // 1. Immediately persist user message in Kotlin background storage
            Thread {
                service.saveMessageToDisk(ws, sessionId, "user", prompt, engine)
            }.start()

            val t = Thread {
                try {
                    val configFile = File(service.filesDir, "config.json")
                    var apiKey = ""
                    var apiKeysJoined = ""
                    if (configFile.exists()) {
                        val json = JSONObject(configFile.readText())
                        apiKey = json.optString("apiKey", "").trim()
                        val keysArray = json.optJSONArray("apiKeys")
                        if (keysArray != null && keysArray.length() > 0) {
                            val keysList = mutableListOf<String>()
                            for (i in 0 until keysArray.length()) {
                                val k = keysArray.optString(i, "").trim()
                                if (k.isNotEmpty() && !keysList.contains(k)) {
                                    keysList.add(k)
                                }
                            }
                            if (keysList.isNotEmpty()) {
                                apiKeysJoined = keysList.joinToString(",")
                                if (apiKey.isEmpty()) apiKey = keysList[0]
                            }
                        }
                    }
                    if (apiKeysJoined.isEmpty()) {
                        apiKeysJoined = apiKey
                    }

                    if (apiKey.isBlank() && apiKeysJoined.isBlank()) {
                        service.mainHandler.post {
                            service.overlayWebView?.evaluateJavascript("window.onAgentError('Set Gemini API Key in Settings first.');", null)
                        }
                        service.isAgentRunningInBackground = false
                        service.activePrompt = null
                        service.activeEngine = null
                        service.activeSessionId = null
                        service.updateBubbleState()
                        return@Thread
                    }

                    // Astra CLI engine selected -> Run inside PRoot in background!
                    EnvironmentManager.initialize(service)
                    val escapedPrompt = prompt.replace("\"", "\\\"").replace("$", "\\$").replace("`", "\\`")
                    val astraCmd = "GEMINI_API_KEYS=\"$apiKeysJoined\" GEMINI_API_KEY=\"$apiKey\" /bin/astra -y --skip-trust --session-id \"$sessionId\" -m \"$model\" -p \"$escapedPrompt\" -o stream-json"

                    val replyAccumulator = StringBuilder()
                    var parsedJson = false

                    val result = ProcessExecutor.execute(service, astraCmd, ws, 0) { line ->
                        val trimmed = line.trim()
                        if (trimmed.isEmpty()) return@execute

                        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                            try {
                                val event = JSONObject(trimmed)
                                parsedJson = true
                                val type = event.optString("type")

                                if (type == "thought") {
                                    val desc = event.optString("description", event.optString("subject", ""))
                                    if (desc.isNotEmpty()) {
                                        synchronized(service.activeStepsJson) {
                                            val stepObj = JSONObject().apply {
                                                put("type", "thought")
                                                put("text", desc)
                                            }
                                            service.activeStepsJson.put(stepObj)
                                        }
                                        service.mainHandler.post {
                                            service.overlayWebView?.evaluateJavascript("window.onAgentStep('thought', ${JSONObject.quote(desc)});", null)
                                        }
                                    }
                                } else if (type == "tool_use" || type == "tool_call") {
                                    val toolName = event.optString("tool_name", event.optString("tool", "tool"))
                                    synchronized(service.activeStepsJson) {
                                        val stepObj = JSONObject().apply {
                                            put("type", "tool")
                                            put("text", toolName)
                                        }
                                        service.activeStepsJson.put(stepObj)
                                    }
                                    service.mainHandler.post {
                                        service.overlayWebView?.evaluateJavascript("window.onAgentStep('tool', ${JSONObject.quote(toolName)});", null)
                                    }
                                } else if (type == "message" || type == "delta") {
                                    val role = event.optString("role", "assistant")
                                    if (role != "user") {
                                        val text = event.optString("content", event.optString("text", ""))
                                        if (text.isNotEmpty()) {
                                            replyAccumulator.append(text)
                                            synchronized(service.activeStepsJson) {
                                                service.activeAccumulatedDelta.append(text)
                                            }
                                            service.mainHandler.post {
                                                service.overlayWebView?.evaluateJavascript("window.onAgentDelta(${JSONObject.quote(text)});", null)
                                            }
                                        }
                                    }
                                } else if (type == "result" || type == "done") {
                                    val resp = event.optString("response", "")
                                    if (resp.isNotEmpty() && replyAccumulator.isEmpty()) {
                                        replyAccumulator.append(resp)
                                        synchronized(service.activeStepsJson) {
                                            service.activeAccumulatedDelta.append(resp)
                                        }
                                        service.mainHandler.post {
                                            service.overlayWebView?.evaluateJavascript("window.onAgentDelta(${JSONObject.quote(resp)});", null)
                                        }
                                    }
                                }
                            } catch (_: Exception) {}
                        }
                    }

                    val finalReply = if (replyAccumulator.isNotEmpty()) {
                        replyAccumulator.toString().trim()
                    } else {
                        result.stdout.lines().filter { l ->
                            val t = l.trim()
                            t.isNotEmpty() && !t.startsWith("export ") && t != prompt.trim()
                        }.joinToString("\n").trim()
                    }

                    // Save assistant response to disk in Kotlin directly
                    if (finalReply.isNotEmpty()) {
                        service.saveMessageToDisk(ws, sessionId, "assistant", finalReply, "proot")
                    }

                    service.mainHandler.post {
                        if (result.exitCode == 0 || finalReply.isNotEmpty()) {
                            service.overlayWebView?.evaluateJavascript("window.onAgentComplete(${JSONObject.quote(finalReply)});", null)
                        } else {
                            service.overlayWebView?.evaluateJavascript("window.onAgentError('Astra CLI failed (exit ${result.exitCode}): ' + ${JSONObject.quote(result.stdout)});", null)
                        }
                    }
                    service.vibrateConfirm()
                } catch (e: Exception) {
                    service.mainHandler.post {
                        service.overlayWebView?.evaluateJavascript("window.onAgentError('Astra Error: ' + ${JSONObject.quote(e.message ?: "Unknown error")});", null)
                    }
                } finally {
                    service.isAgentRunningInBackground = false
                    service.activePrompt = null
                    service.activeEngine = null
                    service.activeSessionId = null
                    synchronized(service.activeStepsJson) {
                        service.activeAccumulatedDelta.setLength(0)
                        while (service.activeStepsJson.length() > 0) {
                            service.activeStepsJson.remove(0)
                        }
                    }
                    service.updateBubbleState()
                }
            }

            service.activeAgentThread = t
            t.start()
        }

        @JavascriptInterface
        fun collapse() {
            service.postCollapseToBubble()
        }
    }

    // ==========================================
    // Custom View: Pyxis Bubble Chat Head
    // ==========================================
    class BubbleView(context: Context) : View(context) {
        private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = Color.parseColor("#181a20")
        }

        private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 3.5f
            color = Color.parseColor("#8ab4f8")
        }

        private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 1.5f
            color = Color.parseColor("#38bdf8")
        }

        private val starPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = Color.parseColor("#8ab4f8")
        }

        private val badgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = Color.parseColor("#10b981")
        }

        private val badgeBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 1.5f
            color = Color.parseColor("#181a20")
        }

        private var isPressedState = false
        private var isActiveTask = false

        fun updateTheme(theme: String) {
            bgPaint.color = if (theme == "light") Color.parseColor("#ffffff") else if (theme == "midnight") Color.parseColor("#0b0f19") else Color.parseColor("#181a20")
            borderPaint.color = if (theme == "midnight") Color.parseColor("#38bdf8") else if (theme == "light") Color.parseColor("#2563eb") else Color.parseColor("#8ab4f8")
            starPaint.color = borderPaint.color
            badgeBorderPaint.color = bgPaint.color
            invalidate()
        }

        fun setIsPressedState(pressed: Boolean) {
            isPressedState = pressed
            invalidate()
        }

        fun setIsActiveTask(active: Boolean) {
            isActiveTask = active
            badgePaint.color = if (active) Color.parseColor("#f59e0b") else Color.parseColor("#10b981")
            invalidate()
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val w = width.toFloat()
            val h = height.toFloat()
            val cx = w / 2f
            val cy = h / 2f
            val radius = min(w, h) / 2f - 4f

            if (isPressedState) {
                canvas.scale(0.92f, 0.92f, cx, cy)
            }

            canvas.drawCircle(cx, cy, radius, bgPaint)
            canvas.drawCircle(cx, cy, radius, borderPaint)
            canvas.drawCircle(cx, cy, radius - 2f, glowPaint)

            val starPath = Path()
            val starSize = radius * 0.65f
            val innerSize = starSize * 0.28f

            starPath.moveTo(cx, cy - starSize)
            starPath.quadTo(cx, cy, cx + innerSize, cy - innerSize)
            starPath.lineTo(cx + starSize, cy)
            starPath.quadTo(cx, cy, cx + innerSize, cy + innerSize)
            starPath.lineTo(cx, cy + starSize)
            starPath.quadTo(cx, cy, cx - innerSize, cy + innerSize)
            starPath.lineTo(cx - starSize, cy)
            starPath.quadTo(cx, cy, cx - innerSize, cy - innerSize)
            starPath.close()

            canvas.drawPath(starPath, starPaint)

            val badgeX = cx + radius * 0.62f
            val badgeY = cy - radius * 0.62f
            val badgeRadius = radius * 0.22f
            canvas.drawCircle(badgeX, badgeY, badgeRadius, badgePaint)
            canvas.drawCircle(badgeX, badgeY, badgeRadius, badgeBorderPaint)
        }
    }

    // ==========================================
    // Custom View: Trash / Dismiss Target
    // ==========================================
    class TrashView(context: Context) : View(context) {
        var isHoveredState: Boolean = false
            private set

        private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = Color.parseColor("#44ef4444")
        }

        private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 3.5f
            color = Color.parseColor("#ef4444")
        }

        private val iconPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 5f
            strokeCap = Paint.Cap.ROUND
            color = Color.WHITE
        }

        fun setHoveredState(hovered: Boolean) {
            if (isHoveredState != hovered) {
                isHoveredState = hovered
                bgPaint.color = if (hovered) Color.parseColor("#ccdc2626") else Color.parseColor("#66ef4444")
                invalidate()
            }
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f
            val cy = height / 2f
            val radius = min(width, height) / 2f - 4f

            if (isHoveredState) {
                canvas.scale(1.15f, 1.15f, cx, cy)
            }

            canvas.drawCircle(cx, cy, radius, bgPaint)
            canvas.drawCircle(cx, cy, radius, borderPaint)

            val crossSize = radius * 0.4f
            canvas.drawLine(cx - crossSize, cy - crossSize, cx + crossSize, cy + crossSize, iconPaint)
            canvas.drawLine(cx + crossSize, cy - crossSize, cx - crossSize, cy + crossSize, iconPaint)
        }
    }

    // ==========================================
    // Custom View: Bottom-Right Resize Handle
    // ==========================================
    class ResizeHandleView(context: Context) : View(context) {
        private val gripPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 3f
            strokeCap = Paint.Cap.ROUND
            color = Color.parseColor("#60a5fa")
        }

        private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 1.5f
            strokeCap = Paint.Cap.ROUND
            color = Color.parseColor("#93c5fd")
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val w = width.toFloat()
            val h = height.toFloat()
            val pad = 6f

            // Diagonal grip lines in the bottom-right corner
            // Line 1 (Shortest)
            canvas.drawLine(w - pad - 6f, h - pad, w - pad, h - pad - 6f, glowPaint)
            // Line 2 (Medium)
            canvas.drawLine(w - pad - 12f, h - pad, w - pad, h - pad - 12f, gripPaint)
            // Line 3 (Longest)
            canvas.drawLine(w - pad - 18f, h - pad, w - pad, h - pad - 18f, glowPaint)
        }
    }
}
