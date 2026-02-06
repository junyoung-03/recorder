export const navigate = (path) => {
  if (!path || path === window.location.pathname + window.location.search) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('app:navigate'));
};
