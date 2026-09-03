let PRootModule: any = null;
try {
  const { requireNativeModule } = require('expo-modules-core');
  PRootModule = requireNativeModule('PRootEngine');
} catch (_) {
  PRootModule = null;
}

export interface PRootExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class PRootEngine {
  /** Check if the native PRoot Linux engine is compiled and available */
  static isAvailable(): boolean {
    return PRootModule !== null && typeof PRootModule.execCommand === 'function';
  }

  /** Check if the Alpine Linux RootFS has been extracted into internal storage */
  static async isRootfsInstalled(): Promise<boolean> {
    if (PRootModule?.isRootfsInstalled) {
      return await PRootModule.isRootfsInstalled();
    }
    return false;
  }

  /** Extract and initialize Alpine Linux RootFS */
  static async installRootfs(): Promise<boolean> {
    if (PRootModule?.installRootfs) {
      return await PRootModule.installRootfs();
    }
    return true;
  }

  /** Execute a shell command inside the embedded Alpine Linux PRoot environment */
  static async execCommand(command: string, cwd = '/'): Promise<PRootExecResult> {
    if (PRootModule?.execCommand) {
      return await PRootModule.execCommand(command, cwd);
    }
    return {
      stdout: `[Alpine PRoot] (Simulated environment) Ran: ${command}\n`,
      stderr: '',
      exitCode: 0,
    };
  }

  /** Install an Alpine Linux package via apk */
  static async installPackage(packageName: string): Promise<PRootExecResult> {
    return await this.execCommand(`apk add --no-cache ${packageName}`);
  }
}
