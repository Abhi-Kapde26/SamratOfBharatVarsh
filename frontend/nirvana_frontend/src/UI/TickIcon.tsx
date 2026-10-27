const TickIcon = ({ status }: { status?: 'sent' | 'delivered' | 'read' | 'seen' }) => {
  if (status === 'read' || status === 'seen') return <span>✔✔</span>; // handle seen = read
  if (status === 'delivered') return <span>✔✔</span>; // maybe change color later
  if (status === 'sent') return <span>✔</span>;
  return null;
};
export default TickIcon;
