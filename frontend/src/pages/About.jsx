import { useState, useEffect } from 'react';

export default function About() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/users')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setUsers(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div>Error loading users: {error}</div>;
  }

  return (
    <div>
      <h1>About Page / User List</h1>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <ul>
          {users.map((u) => (
            <li key={u.id}>
              {u.name} &lt;{u.email}&gt;
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

