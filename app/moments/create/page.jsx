export default function CreateMomentPage() {
  return (
    <div>
      <h2>Create Moment</h2>
      <p>This page is a scaffold. Implement form and submit to `/api/moments`.</p>
      <form>
        <div style={{marginBottom: 8}}>
          <label>Title</label>
          <input name="title" />
        </div>
        <div style={{marginBottom: 8}}>
          <label>Content</label>
          <textarea name="content" />
        </div>
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
