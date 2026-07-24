type CardProps = {
  title: string;
  description: string;
  icon?: string;
};

export default function Card({
  title,
  description,
  icon,
}: CardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition duration-300">
      {icon && (
        <div className="text-5xl mb-4">
          {icon}
        </div>
      )}

      <h3 className="text-2xl font-bold text-blue-700">
        {title}
      </h3>

      <p className="mt-3 text-gray-600">
        {description}
      </p>
    </div>
  );
}