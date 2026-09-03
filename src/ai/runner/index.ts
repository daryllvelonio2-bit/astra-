import { ExecutionRequest, ExecutionResult } from "./types";
import { runClientJavaScript } from "./clientRunner";
import { runPistonCode } from "./pistonRunner";
import { PhpEngineService } from "../../ide/services/phpEngineService";

export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  const { code, language } = request;
  const lang = (language || "javascript").toLowerCase();

  if (lang === "php") {
    try {
      const output = await PhpEngineService.runPhpCode(code);
      return {
        stdout: output,
        stderr: "",
        exitCode: 0,
      };
    } catch (err: any) {
      return {
        stdout: "",
        stderr: err.message || String(err),
        exitCode: 1,
      };
    }
  }

  if (lang === "javascript" || lang === "js") {
    return await runClientJavaScript(code);
  }

  return await runPistonCode(code, lang);
}


