/**
 * Sets up column drag-and-drop for table headers.
 * Single implementation used by both personal and team dashboards.
 */
export function setupColumnDragAndDrop(
  getColumnOrder: () => string[],
  setColumnOrder: (order: string[]) => void,
  onReorder: () => void,
): void {
  let draggedColumn: HTMLElement | null = null;

  const headers = document.querySelectorAll<HTMLElement>('th.draggable');

  headers.forEach(header => {
    header.addEventListener('dragstart', (e) => {
      draggedColumn = e.currentTarget as HTMLElement;
      draggedColumn.classList.add('dragging');
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', draggedColumn.dataset.columnKey || '');
    });

    header.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      const target = e.currentTarget as HTMLElement;
      if (draggedColumn !== target && target.classList.contains('draggable')) {
        target.classList.add('drag-over');
      }
    });

    header.addEventListener('drop', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      if (draggedColumn && draggedColumn !== target && target.classList.contains('draggable')) {
        const draggedKey = draggedColumn.dataset.columnKey;
        const targetKey = target.dataset.columnKey;

        if (draggedKey && targetKey) {
          const columnOrder = getColumnOrder();
          const draggedIndex = columnOrder.indexOf(draggedKey);
          const targetIndex = columnOrder.indexOf(targetKey);

          if (draggedIndex !== -1 && targetIndex !== -1) {
            columnOrder.splice(draggedIndex, 1);
            const newTargetIndex = columnOrder.indexOf(targetKey);
            columnOrder.splice(newTargetIndex, 0, draggedKey);
            setColumnOrder(columnOrder);
            onReorder();
          }
        }
      }
      target.classList.remove('drag-over');
    });

    header.addEventListener('dragend', (e) => {
      (e.currentTarget as HTMLElement).classList.remove('dragging');
      document.querySelectorAll('th').forEach(h => h.classList.remove('drag-over'));
      draggedColumn = null;
    });
  });
}
