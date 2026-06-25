// A variable-name input with a native datalist of known variable names. The
// datalist only suggests - the user can still type a brand-new name to create a
// new variable. Mirrors the Input API (plus `names`).
import { useId, type InputHTMLAttributes } from "react";
import { Input } from "./Field";

interface VarNameInputProps extends InputHTMLAttributes<HTMLInputElement> {
    names: string[];
}

export function VarNameInput({ names, ...rest }: VarNameInputProps) {
    const id = useId();
    return (
        <>
            <Input list={id} autoComplete="off" {...rest} />
            <datalist id={id}>
                {names.map((n) => (
                    <option key={n} value={n} />
                ))}
            </datalist>
        </>
    );
}
