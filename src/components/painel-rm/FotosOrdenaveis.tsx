import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function Foto({ url, indice, remover }: { url: string; indice: number; remover: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`relative aspect-square overflow-hidden rounded-md bg-muted ${isDragging ? "z-10 ring-2 ring-primary opacity-70" : ""}`}>
    <img src={url} alt={`Foto ${indice + 1}`} draggable={false} className="h-full w-full object-cover" />
    <Button type="button" variant="secondary" size="icon" className="absolute left-1 top-1 h-7 w-7 touch-none cursor-grab active:cursor-grabbing" {...attributes} {...listeners} aria-label={`Mover foto ${indice + 1}`} title={`Mover foto ${indice + 1}`}><GripVertical className="h-4 w-4" /></Button>
    <Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 h-7 w-7" aria-label={`Excluir foto ${indice + 1}`} title="Excluir foto" onClick={remover}><Trash2 className="h-3.5 w-3.5" /></Button>
    <Badge variant="secondary" className="absolute bottom-1 left-1 px-1.5 text-xs">{indice === 0 ? "1 · Capa" : indice + 1}</Badge>
  </div>;
}

export function FotosOrdenaveis({ fotos, onChange }: { fotos: string[]; onChange: (fotos: string[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
    if (!over || active.id === over.id) return;
    const origem = fotos.indexOf(String(active.id));
    const destino = fotos.indexOf(String(over.id));
    if (origem >= 0 && destino >= 0) onChange(arrayMove(fotos, origem, destino));
  }}><SortableContext items={fotos} strategy={rectSortingStrategy}><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{fotos.map((url, indice) => <Foto key={url} url={url} indice={indice} remover={() => onChange(fotos.filter((foto) => foto !== url))} />)}</div></SortableContext></DndContext>;
}