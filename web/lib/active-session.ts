export class ActiveSession {
  private static activeId: string | null = null;
  private static listeners: Set<() => void> = new Set();
  private static inputHandler: ((text: string) => void) | null = null;

  static setActive(id: string) {
    this.activeId = id;
    this.notify();
  }

  static clear() {
    this.activeId = null;
    this.notify();
  }

  static getActiveId() {
    return this.activeId;
  }

  static isActive(id: string) {
    return this.activeId === id;
  }
  
  static hasActiveSession() {
      return this.activeId !== null;
  }

  static subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private static notify() {
    this.listeners.forEach(cb => cb());
  }

  static setInputHandler(handler: (text: string) => void) {
      this.inputHandler = handler;
  }

  static removeInputHandler() {
      this.inputHandler = null;
  }

  static getInputHandler() {
      return this.inputHandler;
  }
}
