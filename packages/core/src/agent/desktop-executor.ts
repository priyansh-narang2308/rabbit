import { DesktopManager } from "../solari/desktop-manager";
import type { DesktopAction } from "./desktop-planner";

export interface DesktopExecutorResult {
  success: boolean;
  action: DesktopAction;
  screenshotBase64: string;
  url: string;
  durationMs: number;
  error?: string;
}

export class DesktopExecutor {
  private desktopManager: DesktopManager;

  constructor(desktopManager: DesktopManager) {
    this.desktopManager = desktopManager;
  }

  async execute(action: DesktopAction): Promise<DesktopExecutorResult> {
    const start = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      switch (action.type) {
        case "click":
          await this.desktopManager.mouseClick(action.x, action.y, action.button);
          break;

        case "type":
          await this.desktopManager.keyboardType(action.text);
          break;

        case "wait":
          await new Promise((resolve) => setTimeout(resolve, action.ms));
          break;

        case "done":
        case "error":
          break;

        default:
          success = false;
          // @ts-ignore
          error = `Unsupported action type: ${action.type}`;
      }
    } catch (err: any) {
      success = false;
      error = err.message;
    }

    const screenshotBuffer = await this.desktopManager.takeScreenshot().catch(() => new Uint8Array());
    const screenshotBase64 = Buffer.from(screenshotBuffer).toString("base64");
    const durationMs = Date.now() - start;

    return {
      success,
      action,
      screenshotBase64,
      url: "desktop://vnc",
      durationMs,
      error,
    };
  }
}
