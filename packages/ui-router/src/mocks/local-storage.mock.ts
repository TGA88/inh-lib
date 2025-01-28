// mocks/mockLocalStorage.ts
export class LocalStorageMock implements Storage {
    private store: { [key: string]: string } = {};
  
    clear() {
      this.store = {};
    }
  
    getItem(key: string) {
      return this.store[key] || null;
    }
  
    setItem(key: string, value: string) {
      this.store[key] = String(value);
    }
  
    removeItem(key: string) {
      delete this.store[key];
    }
  
    key(index: number) {
      return Object.keys(this.store)[index] || null;
    }
  
    get length() {
      return Object.keys(this.store).length;
    }
  }
  
//   // mocks/mockEvents.ts
//   export const createMockMouseEvent = (target: HTMLElement | Document | null = document.body) => {
//     return new MouseEvent('mousedown', {
//       bubbles: true,
//       cancelable: true,
//       target: target as EventTarget
//     });
//   };
  
//   export const createMockTouchEvent = (target: HTMLElement | Document | null = document.body) => {
//     return new TouchEvent('touchstart', {
//       bubbles: true,
//       cancelable: true,
//       target: target as EventTarget
//     });
//   };
  
//   // mocks/mockRef.ts
//   export const createMockRef = (element: HTMLElement | null = null) => {
//     return { current: element };
//   };
  
//   // mocks/mockTimer.ts
//   export const mockTimer = {
//     setup() {
//       jest.useFakeTimers();
//     },
//     cleanup() {
//       jest.useRealTimers();
//     },
//     advance(ms: number) {
//       jest.advanceTimersByTime(ms);
//     },
//     runAll() {
//       jest.runAllTimers();
//     },
//     clear() {
//       jest.clearAllTimers();
//     }
//   };