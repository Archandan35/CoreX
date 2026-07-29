export async function asJson(res) {
  let data = null;
  try { data = await res.json(); } catch { }
  return { ok: res.ok, status: res.status, data };
}
