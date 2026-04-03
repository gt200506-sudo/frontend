import { useEffect, useState } from "react";

const GlassCursor = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);
    };
    const leave = () => setVisible(false);
    const enter = () => setVisible(true);

    window.addEventListener("mousemove", move);
    document.addEventListener("mouseleave", leave);
    document.addEventListener("mouseenter", enter);
    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseleave", leave);
      document.removeEventListener("mouseenter", enter);
    };
  }, [visible]);

  return (
    <div
      className="pointer-events-none fixed z-[200] rounded-full"
      style={{
        width: 40,
        height: 40,
        left: pos.x - 20,
        top: pos.y - 20,
        opacity: visible ? 1 : 0,
        background: "radial-gradient(circle, hsl(175 72% 46% / 0.15) 0%, transparent 70%)",
        border: "1.5px solid hsl(175 72% 46% / 0.3)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 0 15px hsl(175 72% 46% / 0.2), inset 0 0 10px hsl(175 72% 46% / 0.05)",
        transition: "left 0.05s ease-out, top 0.05s ease-out, opacity 0.3s",
      }}
    />
  );
};

export default GlassCursor;
