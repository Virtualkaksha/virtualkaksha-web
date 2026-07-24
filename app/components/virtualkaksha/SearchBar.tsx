import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  placeholder?: string;
  buttonLabel?: string;
}

export default function SearchBar({
  placeholder = "Search resources, subjects or teachers",
  buttonLabel = "Search",
}: SearchBarProps) {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />

        <Input
          type="search"
          placeholder={placeholder}
          className="h-12 pl-11"
        />
      </div>

      <Button type="button" className="h-12 px-6">
        {buttonLabel}
      </Button>
    </div>
  );
}