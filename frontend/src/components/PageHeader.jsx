import { Circle, Squiggle, Triangle } from "./Shapes";

/** Colored banner at the top of inner pages. */
export default function PageHeader({ chip, title, children, bg = "bg-teal", actions }) {
  return (
    <header className={`card relative mb-10 overflow-hidden ${bg} px-6 py-8 sm:px-10`}>
      <Circle color="#ffd23f" className="absolute -right-6 -top-6 w-24 animate-float-slow" />
      <Triangle color="#ff5fa2" className="absolute bottom-3 right-28 hidden w-10 animate-wiggle sm:block" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          {chip && <span className="chip bg-white">{chip}</span>}
          <h1 className="mt-3 text-4xl sm:text-6xl">{title}</h1>
          <Squiggle color="#151515" className="mt-2 w-32" />
          {children && <div className="mt-3 max-w-2xl font-medium">{children}</div>}
        </div>
        {actions}
      </div>
    </header>
  );
}
