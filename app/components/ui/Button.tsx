type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export default function Button({
  children,
  variant = "primary",
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-white border border-blue-600 text-blue-600 hover:bg-blue-50";

  return (
    <button
      className={`px-6 py-3 rounded-xl font-semibold transition ${styles}`}
    >
      {children}
    </button>
  );
}