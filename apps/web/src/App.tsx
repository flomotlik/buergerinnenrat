import type { Component } from 'solid-js';

export const App: Component = () => {
  return (
    <main class="mx-auto max-w-3xl px-6 py-12">
      <h1 class="text-3xl font-semibold tracking-tight">Sortition Iteration 1</h1>
      <p class="mt-4 text-slate-600">
        Browser-native Ziehung nach Maximin — statisch ausgeliefert, keine Backend-Abhängigkeit.
      </p>
    </main>
  );
};
