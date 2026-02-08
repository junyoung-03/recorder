const ALLOWED_FRIEND_PAGES = new Set(['exercise', 'body', 'journal']);
const ALLOWED_FRIEND_NAV = new Set(['/exercise', '/journal']);

export const canAccessFriendPage = (type) => ALLOWED_FRIEND_PAGES.has(type);

export const getAllowedFriendPages = () => Array.from(ALLOWED_FRIEND_PAGES);

export const canNavigateFromFriend = (path) => ALLOWED_FRIEND_NAV.has(path);

export const getFriendContext = (pathname) => {
  if (!pathname || typeof pathname !== 'string') {
    return { isFriendMode: false, friendId: null, type: null, detailId: null };
  }
  if (!pathname.startsWith('/friend/')) {
    return { isFriendMode: false, friendId: null, type: null, detailId: null };
  }
  const [, , friendId, type, detailId] = pathname.split('/');
  return { isFriendMode: Boolean(friendId), friendId: friendId || null, type: type || null, detailId: detailId || null };
};

export const getFriendNavTarget = (path, friendId) => {
  if (!friendId) return path;
  if (path === '/exercise') return `/friend/${friendId}/exercise`;
  if (path === '/journal') return `/friend/${friendId}/journal`;
  return path;
};
