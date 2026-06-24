import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import { apiBaseUrl } from "./config";
import "./style.css";

type User = { id: string; name: string; email: string; role: "admin" | "user"; membershipActive: boolean };
type Book = { _id: string; title: string; author: string; description: string; price: number; rentPrice: number; stock: number };
type Comment = { _id: string; content: string; user?: { name: string } };
type Request = { _id: string; title: string; author: string; message: string; status: string; user?: { name: string } };

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

const api = axios.create({ baseURL: apiBaseUrl });

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const userRaw = localStorage.getItem("user");
    return userRaw ? (JSON.parse(userRaw) as User) : null;
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [requests, setRequests] = useState<Request[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [bookForm, setBookForm] = useState({ title: "", author: "", description: "", price: 0, rentPrice: 0, stock: 0 });
  const [requestForm, setRequestForm] = useState({ title: "", author: "", message: "" });

  const headers = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchBooks = async () => {
    const { data } = await api.get<Book[]>("/books");
    setBooks(ensureArray<Book>(data));
  };
  const fetchComments = async (bookId: string) => {
    const { data } = await api.get<Comment[]>(`/books/${bookId}/comments`);
    setComments((prev) => ({ ...prev, [bookId]: ensureArray<Comment>(data) }));
  };
  const fetchAdminData = async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    const [requestRes, userRes] = await Promise.all([
      api.get<Request[]>("/requests", headers),
      api.get<User[]>("/users", headers),
    ]);
    setRequests(ensureArray<Request>(requestRes.data));
    setMembers(ensureArray<User>(userRes.data));
  };

  useEffect(() => {
    fetchBooks().catch(() => setMessage("Failed to load books"));
  }, []);

  useEffect(() => {
    fetchAdminData().catch(() => setMessage("Failed to load admin data"));
  }, [currentUser, token]);

  const handleAuth = async () => {
    if (authMode === "register" && (!authForm.name.trim() || !authForm.email.trim() || !authForm.password)) {
      setMessageType("error");
      setMessage("Name, email, and password are required");
      return;
    }

    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload = authMode === "login" ? { email: authForm.email, password: authForm.password } : authForm;
      const { data } = await api.post(endpoint, payload);
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMessageType("success");
      setMessage("Authenticated");
    } catch (error) {
      const apiMessage = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      setMessageType("error");
      setMessage(apiMessage || "Authentication failed");
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken("");
    setCurrentUser(null);
    setMembers([]);
    setRequests([]);
  };

  const addBook = async () => {
    await api.post("/books", bookForm, headers);
    await fetchBooks();
  };

  return (
    <main className="container">
      <h1>Bookstore Application</h1>
      {message && <p className={`message ${messageType}`}>{message}</p>}

      {!currentUser && (
        <section className="card">
          <h2>{authMode === "login" ? "Login" : "Register"}</h2>
          {authMode === "register" && <input placeholder="Name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />}
          <input placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
          <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
          <button onClick={handleAuth}>{authMode}</button>
          <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>Switch</button>
        </section>
      )}

      {currentUser && (
        <section className="card">
          <h2>{currentUser.name} ({currentUser.role})</h2>
          <button onClick={logout}>Logout</button>
        </section>
      )}

      {currentUser?.role === "admin" && (
        <section className="card">
          <h2>Add Book</h2>
          <input placeholder="Title" onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} />
          <input placeholder="Author" onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} />
          <textarea placeholder="Description" onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })} />
          <input type="number" placeholder="Price" onChange={(e) => setBookForm({ ...bookForm, price: Number(e.target.value) })} />
          <input type="number" placeholder="Rent Price" onChange={(e) => setBookForm({ ...bookForm, rentPrice: Number(e.target.value) })} />
          <input type="number" placeholder="Stock" onChange={(e) => setBookForm({ ...bookForm, stock: Number(e.target.value) })} />
          <button onClick={addBook}>Save</button>
        </section>
      )}

      <section className="books">
        {books.map((book) => (
          <article className="card" key={book._id}>
            <h3>{book.title}</h3>
            <p>{book.author}</p>
            <p>{book.description}</p>
            <p>Buy: ${book.price} | Rent: ${book.rentPrice} | Stock: {book.stock}</p>
            {currentUser?.role === "admin" && <button onClick={async () => { await api.delete(`/books/${book._id}`, headers); await fetchBooks(); }}>Remove</button>}
            {currentUser?.role === "user" && (
              <div className="row">
                <button onClick={async () => { await api.post(`/books/${book._id}/order`, { type: "purchase" }, headers); await fetchBooks(); }}>Purchase</button>
                <button onClick={async () => { await api.post(`/books/${book._id}/order`, { type: "rent" }, headers); await fetchBooks(); }}>Rent</button>
                <button onClick={() => fetchComments(book._id)}>Discussion</button>
              </div>
            )}
            {currentUser && (
              <div className="discussion">
                <input onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    const value = (e.target as HTMLInputElement).value;
                    if (value.trim()) {
                      await api.post(`/books/${book._id}/comments`, { content: value }, headers);
                      (e.target as HTMLInputElement).value = "";
                      await fetchComments(book._id);
                    }
                  }
                }} placeholder="Write a comment" />
                {(comments[book._id] || []).map((c) => <p key={c._id}><strong>{c.user?.name || "User"}:</strong> {c.content}</p>)}
              </div>
            )}
          </article>
        ))}
      </section>

      {currentUser?.role === "user" && (
        <section className="card">
          <h2>Request Unavailable Book</h2>
          <input placeholder="Book title" value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} />
          <input placeholder="Author" value={requestForm.author} onChange={(e) => setRequestForm({ ...requestForm, author: e.target.value })} />
          <textarea placeholder="Message" value={requestForm.message} onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })} />
          <button onClick={async () => { await api.post("/requests", requestForm, headers); setMessage("Request sent"); }}>Submit Request</button>
        </section>
      )}

      {currentUser?.role === "admin" && (
        <>
          <section className="card">
            <h2>User Membership</h2>
            {members.map((u) => (
              <div className="row" key={u.id}>
                <span>{u.name} ({u.membershipActive ? "Active" : "Inactive"})</span>
                <button onClick={async () => { await api.put(`/users/${u.id}/membership`, { membershipActive: !u.membershipActive }, headers); await fetchAdminData(); }}>Toggle</button>
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Requested Books</h2>
            {requests.map((r) => (
              <div className="row" key={r._id}>
                <span>{r.title} - {r.status}</span>
                <button onClick={async () => { await api.put(`/requests/${r._id}`, { status: "in_progress" }, headers); await fetchAdminData(); }}>In Progress</button>
                <button onClick={async () => { await api.put(`/requests/${r._id}`, { status: "fulfilled" }, headers); await fetchAdminData(); }}>Fulfilled</button>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
};

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
