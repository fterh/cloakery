export const Landing = () => {
  return (
    <>
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-sm font-medium text-blue-400 mb-8 backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        Under Development
      </div>

      {/* Hero Text */}
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-400 mb-6 drop-shadow-sm leading-tight pb-2">
        Your inbox,{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          cloaked.
        </span>
      </h1>

      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
        Protect your email address from spam, marketing, and data breaches.
        Cloakery provides privacy-first seamless email aliasing and forwarding
        to hide your real email address.
      </p>
    </>
  );
};
