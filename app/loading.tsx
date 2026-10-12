import { BrandLogo } from "@/app/components/brand/BrandLogo";

export default function Loading() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-white">
      <BrandLogo href="/" size={56} priority />
    </div>
  );
}
