import { Link } from "react-router";
import { Circle, Cross, Triangle, Zigzag } from "../components/Shapes";

export default function NotFound() {
  return (
    <section className="relative py-20 text-center">
      <Triangle color="#ff5fa2" className="absolute left-[15%] top-6 w-16 animate-float" />
      <Circle color="#2ec4b6" className="absolute right-[18%] top-16 w-12 animate-bob" />
      <Cross color="#ffd23f" className="absolute bottom-6 left-[25%] w-12 animate-spin-slow" />
      <p className="inline-block animate-wiggle font-display text-[9rem] leading-none text-purple [-webkit-text-stroke:4px_#151515] sm:text-[12rem]">
        404
      </p>
      <Zigzag color="#ff7f3f" className="mx-auto mt-2 w-40" />
      <p className="mt-6 text-2xl font-bold">Esta página se fue de préstamo y nunca volvió.</p>
      <Link to="/" className="btn-primary mt-8">Volver al inicio</Link>
    </section>
  );
}
