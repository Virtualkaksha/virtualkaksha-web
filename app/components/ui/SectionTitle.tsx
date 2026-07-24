type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export default function SectionTitle({
  title,
  subtitle,
}: SectionTitleProps) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold text-blue-700">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-4 text-gray-600">
          {subtitle}
        </p>
      )}
    </div>
  );
}