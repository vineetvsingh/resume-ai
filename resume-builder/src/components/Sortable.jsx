import { useState } from "react"
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter
} from "@dnd-kit/core"
import { SortableContext, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { GripVertical, ChevronUp, ChevronDown } from "lucide-react"

// Items stay in place while dragging; a line shows where the dragged item will land instead
const keepInPlace = () => null

// A vertical list that can be reordered with a mouse, a long press on touch screens, or the keyboard.
// children(id, index, drop) renders each item; drop is "before" | "after" | null for the landing line.
export function SortableList({ ids, onMove, getName, renderOverlay, children }) {
  const [activeId, setActiveId] = useState(null)
  const [overId, setOverId] = useState(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // A long press starts the drag on touch, so ordinary swipes still scroll the page
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeIndex = ids.indexOf(activeId)
  const overIndex = ids.indexOf(overId)
  const dropFor = (id) => {
    if (activeId === null || id !== overId || overId === activeId) return null
    return overIndex > activeIndex ? "after" : "before"
  }
  const reset = () => { setActiveId(null); setOverId(null) }
  const position = (id) => ids.indexOf(id) + 1

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => { setActiveId(e.active.id); setOverId(e.active.id) }}
      onDragOver={(e) => setOverId(e.over?.id ?? null)}
      onDragEnd={(e) => {
        const from = ids.indexOf(e.active.id)
        const to = ids.indexOf(e.over?.id)
        reset()
        if (to >= 0 && from !== to) onMove(from, to)
      }}
      onDragCancel={reset}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${getName(active.id)}. Use the arrow keys to move it, Space to drop, Escape to cancel.`,
          onDragOver: ({ active, over }) => over ? `${getName(active.id)} will move to position ${position(over.id)} of ${ids.length}.` : "",
          onDragEnd: ({ active, over }) => over ? `${getName(active.id)} moved to position ${position(over.id)} of ${ids.length}.` : `${getName(active.id)} dropped.`,
          onDragCancel: ({ active }) => `Moving ${getName(active.id)} was cancelled.`
        }
      }}
    >
      <SortableContext items={ids} strategy={keepInPlace}>
        {ids.map((id, i) => children(id, i, dropFor(id)))}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId !== null ? <div className="drag-ghost">{renderOverlay(activeId)}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}

// One sortable item. children({ handle, isDragging }) renders it; spread `handle` onto the drag handle.
export function SortableItem({ id, as: Tag = "div", className = "", drop, children }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useSortable({ id })
  const handle = { ref: setActivatorNodeRef, ...attributes, ...listeners }
  return (
    <Tag ref={setNodeRef} className={`sortable ${isDragging ? "is-dragging" : ""} ${className}`} data-drop={drop || undefined}>
      {children({ handle, isDragging })}
    </Tag>
  )
}

// Drag handle plus Move up / Move down buttons for keyboard and assistive tech users
export function ReorderTools({ handle, name, index, count, onMove, size = 15 }) {
  return (
    <span className="reorder-tools">
      <button type="button" className="reorder-btn drag-handle" title="Drag to move" {...handle} aria-label={`Drag to move ${name}`}>
        <GripVertical size={size} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="reorder-btn"
        aria-label={`Move ${name} up`}
        title="Move up"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ChevronUp size={size} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="reorder-btn"
        aria-label={`Move ${name} down`}
        title="Move down"
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ChevronDown size={size} strokeWidth={2} />
      </button>
    </span>
  )
}
