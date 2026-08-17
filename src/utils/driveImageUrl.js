/**
 * Candidate public URLs for a Google Drive file, most reliable first.
 * `lh3.googleusercontent.com/d/<id>` is the modern image CDN; the
 * `thumbnail` endpoint redirects to an image variant and works for
 * files that haven't propagated to lh3 yet.
 */
export function getDriveImageUrls(fileId) {
  return [
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
  ];
}
