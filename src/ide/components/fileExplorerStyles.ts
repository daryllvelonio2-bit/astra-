import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRightWidth: 1,
    paddingTop: 8,
    position: 'relative',
  },
  bottomResizeBox: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomResizeBoxActive: {
    backgroundColor: 'rgba(138, 180, 248, 0.08)',
  },
  resizeIndicator: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  resizeIndicatorActive: {
    backgroundColor: '#8ab4f8',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  header: {
    color: '#bbbbbb',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
  dragGhost: {
    position: "absolute",
    zIndex: 9999,
    elevation: 25,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#8ab4f8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    maxWidth: 220,
  },
  dragGhostIcon: {
    marginRight: 6,
  },
  dragGhostText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#777",
    fontSize: 12,
  },
  inlineCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#0e639c",
  },
  inlineInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 11.5,
    fontFamily: "monospace",
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  inlineBtn: {
    padding: 2,
    marginLeft: 2,
  },
  emptySubtext: {
    color: "#8ab4f8",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "bold",
  },
  folderContainer: {
    marginVertical: 1,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  folderHoverTarget: {
    backgroundColor: "rgba(138, 180, 248, 0.25)",
    borderWidth: 1,
    borderColor: "#8ab4f8",
  },
  folderName: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  folderNameHover: {
    color: "#8ab4f8",
    fontWeight: "700",
  },
  childrenContainer: {
    paddingLeft: 12,
  },
  fileWrapper: {
    marginVertical: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeFileItem: {
    backgroundColor: '#37373d',
  },
  fileIconWrapper: {
    marginRight: 6,
  },
  fileName: {
    color: '#9cdcfe',
    fontSize: 13,
    flex: 1,
  },
  activeFileName: {
    color: '#ffffff',
    fontWeight: '600',
  },
  rootDropZone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#3a3f4b",
    borderStyle: "dashed",
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  rootDropZoneActive: {
    borderColor: "#8ab4f8",
    backgroundColor: "rgba(138, 180, 248, 0.25)",
  },
  rootDropZoneText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "500",
  },
  rootDropZoneTextActive: {
    color: "#8ab4f8",
    fontWeight: "700",
  },
  moreActionBtn: {
    padding: 3,
    marginLeft: 2,
    opacity: 0.7,
  },
});
