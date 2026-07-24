import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BoardCardProps {
  title: string;
  description: string;
  href: string;
  label?: string;
}

export default function BoardCard({
  title,
  description,
  href,
  label = "School Board",
}: BoardCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-200 group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BookOpen className="h-6 w-6" />
            </div>

            <Badge variant="secondary">{label}</Badge>
          </div>

          <CardTitle className="mt-4 text-xl">{title}</CardTitle>

          <CardDescription className="leading-6">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            Explore {title}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}