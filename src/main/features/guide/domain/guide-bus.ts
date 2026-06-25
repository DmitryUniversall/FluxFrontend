// A decoupled signal channel. Any app code can satisfy an `event` gate by
// calling `guide.signal("name")` without importing the overlay, and the active
// step subscribes here to listen for its event. Kept deliberately tiny.
type Listener = (name: string) => void;

const listeners = new Set<Listener>();

export const guideBus = {
    emit(name: string): void {
        for (const l of listeners) l(name);
    },
    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};
