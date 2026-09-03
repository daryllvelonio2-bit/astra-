import {
  initializeEnvironment,
  executeCommand,
  installPackages,
  runArtisan,
  startTerminalSession,
  writeTerminalInput,
  addTerminalDataListener
} from '../../../modules/linux-runner/src';

export async function runLinuxRunnerTestSuite(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  try {
    log.push('1. Initializing Linux environment...');
    const initialized = await initializeEnvironment();
    log.push(`Environment initialized: ${initialized}`);

    log.push('2. Running uname -a...');
    const unameRes = await executeCommand('uname -a');
    log.push(`Result (exit ${unameRes.exitCode}):\n${unameRes.stdout}`);

    log.push('3. Installing packages (php, php-sqlite3, composer)...');
    const pkgRes = await installPackages(['php', 'php-sqlite3', 'composer']);
    log.push(`Install Result (exit ${pkgRes.exitCode}):\n${pkgRes.stdout}`);

    log.push('4. Verifying PHP version...');
    const phpRes = await executeCommand('php -v');
    log.push(`PHP Version (exit ${phpRes.exitCode}):\n${phpRes.stdout}`);

    return { success: true, log };
  } catch (error: any) {
    log.push(`Error in test suite: ${error?.message || error}`);
    return { success: false, log };
  }
}
