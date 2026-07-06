import { coreIcons } from './icon-sets/core-icons';

export interface IconRegistryOptions {
  defaultSize?: number;
  defaultColor?: string;
}

export class IconRegistry {
  private icons = new Map<string, string>(Object.entries(coreIcons));
  private options: IconRegistryOptions;

  constructor(options: IconRegistryOptions = {}) {
    this.options = { defaultSize: 16, defaultColor: 'currentColor', ...options };
  }

  register(name: string, svgContent: string): void {
    this.icons.set(name, svgContent);
  }

  registerAll(iconSet: Record<string, string>): void {
    for (const [name, svg] of Object.entries(iconSet)) {
      this.icons.set(name, svg);
    }
  }

  has(name: string): boolean {
    return this.icons.has(name);
  }

  get(name: string): string | undefined {
    return this.icons.get(name);
  }

  getAll(): Map<string, string> {
    return new Map(this.icons);
  }

  remove(name: string): void {
    this.icons.delete(name);
  }

  clear(): void {
    this.icons.clear();
  }

  loadCoreIcons(): void {
    this.registerAll(coreIcons);
  }

  getNames(): string[] {
    return Array.from(this.icons.keys());
  }
}
