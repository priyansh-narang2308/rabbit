import type { Page } from "playwright-core";
import type { Action } from "./planner";

export interface ExecutorResult {
  success: boolean;
  action: Action;
  screenshotBase64: string;
  url: string;
  durationMs: number;
  error?: string;
}

export class Executor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async execute(action: Action): Promise<ExecutorResult> {
    const start = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      switch (action.type) {
        case "navigate":
          await this.page.goto(action.url, {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          break;

        case "click":
          await this.page.waitForSelector(action.selector, { timeout: 5_000 });
          await this.page.click(action.selector);
          break;

        case "type":
          await this.page.waitForSelector(action.selector, { timeout: 5_000 });
          await this.page.fill(action.selector, action.value);
          break;

        case "scroll":
          await this.page.evaluate((dir: string) => {
            const amount = dir === "down" ? 500 : -500;
            window.scrollBy(0, amount);
          }, action.direction);
          break;

        case "evaluate":
          await this.page.evaluate(action.script);
          break;

        case "wait":
          await this.page.waitForTimeout(action.ms);
          break;

        case "extract": {
          const el = await this.page.waitForSelector(action.selector, {
            timeout: 5_000,
          });
          if (el) {
            const text = await el.textContent();
            (action as any).extractedValue = text?.trim() || "";
          }
          break;
        }

        case "done":
          break;

        case "error":
          break;
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : "Unknown execution error";
    }

    const screenshotBuffer = await this.page
      .screenshot({ type: "png" })
      .catch(() => Buffer.from(""));
    const screenshotBase64 = Buffer.from(screenshotBuffer).toString("base64");

    const url = this.page.url();
    const durationMs = Date.now() - start;

    return {
      success,
      action,
      screenshotBase64,
      url,
      durationMs,
      error,
    };
  }

  async getDOM(): Promise<string> {
    return await this.page.evaluate(() => {
      function simplify(el: Element, depth: number): string {
        if (depth > 4) return "";
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const cls =
          el.className && typeof el.className === "string"
            ? `.${el.className.trim().split(/\s+/).join(".")}`
            : "";
        const text =
          el.childNodes.length === 1 &&
          el.childNodes[0].nodeType === Node.TEXT_NODE
            ? ` "${(el.textContent || "").trim().slice(0, 60)}"`
            : "";

        const attrs: string[] = [];
        const href = el.getAttribute("href");
        const src = el.getAttribute("src");
        const placeholder = el.getAttribute("placeholder");
        const role = el.getAttribute("role");
        const ariaLabel = el.getAttribute("aria-label");
        const type = el.getAttribute("type");
        const name = el.getAttribute("name");
        const value = (el as HTMLInputElement).value;

        if (href) attrs.push(`href="${href.slice(0, 80)}"`);
        if (src) attrs.push(`src="${src.slice(0, 80)}"`);
        if (placeholder) attrs.push(`placeholder="${placeholder}"`);
        if (role) attrs.push(`role="${role}"`);
        if (ariaLabel) attrs.push(`aria-label="${ariaLabel}"`);
        if (type) attrs.push(`type="${type}"`);
        if (name) attrs.push(`name="${name}"`);
        if (value && tag === "input")
          attrs.push(`value="${value.slice(0, 40)}"`);

        const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
        const indent = "  ".repeat(depth);

        const children = Array.from(el.children)
          .filter((c) => {
            const s = getComputedStyle(c);
            return s.display !== "none" && s.visibility !== "hidden";
          })
          .map((c) => simplify(c, depth + 1))
          .filter(Boolean)
          .join("\n");

        if (children) {
          return `${indent}<${tag}${id}${cls}${attrStr}${text}>\n${children}\n${indent}</${tag}>`;
        }

        return `${indent}<${tag}${id}${cls}${attrStr}${text} />`;
      }

      return simplify(document.body, 0);
    });
  }
}
