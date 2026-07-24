import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface SubjectCardProps {
  title: string;
  chapters: number;
  href: string;
}

export default function SubjectCard({
  title,
  chapters,
  href,
}: SubjectCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-200 group-hover:shadow-md">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {title}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {chapters} chapters
              </p>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700" />
        </CardContent>
      </Card>
    </Link>
  );
}