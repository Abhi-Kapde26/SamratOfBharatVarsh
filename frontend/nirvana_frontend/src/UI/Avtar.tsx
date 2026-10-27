const Avatar = ({ url }: { url?: string }) => (
  <img src={url || '/default-avatar.png'} alt="user" className="w-8 h-8 rounded-full" />
);
export default Avatar;
