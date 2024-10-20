// todoUtils.ts
export function findDropIndex(e: DragEvent, currentIndex: number, itemCount: number): number | null {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const itemHeight = rect.height;
    
    if (currentIndex === 0 && relativeY < itemHeight / 2) {
      return 0;
    }
    
    if (currentIndex === itemCount - 1 && relativeY > itemHeight / 2) {
      return itemCount;
    }
    
    return relativeY > itemHeight / 2 ? currentIndex + 1 : currentIndex;
  }
  
export function isWithinExpandedRect(e: DragEvent, rect: DOMRect, padding: number = 20): boolean {
  const expandedRect = {
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding
  };

  return (
    e.clientX >= expandedRect.left &&
    e.clientX <= expandedRect.right &&
    e.clientY >= expandedRect.top &&
    e.clientY <= expandedRect.bottom
  );
}

