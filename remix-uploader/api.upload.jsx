import { json } from "@remix-run/node";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "public/uploads");

const makeDir = async () => {
  await fs.mkdir(uploadDir, { recursive: true });
};

makeDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.split(" ").join("-")}`);
  },
});

const upload = multer({ storage });

// Handle the action to process the file
export const action = async ({ request }) => {
  const formData = await request.formData();
  const image = formData.get("image"); // Get the file from FormData

  // Check if the image exists in the form data
  if (!image) {
    return json({ error: "No image file found in form data" }, { status: 400 });
  }

  // Manually handle the file upload
  const buffer = await image.arrayBuffer();
  const file = {
    buffer,
    originalname: image.name,
  };

  return new Promise((resolve, reject) => {
    // Use multer to store the file manually
    upload.single("image")(request, {}, (err) => {
      if (err) {
        console.log("Error saving file", err);
        reject(json({ error: "File upload failed" }, { status: 500 }));
      } else {
        const filePath = path.join(uploadDir, `${Date.now()}-screenshot.png`);
        fs.writeFile(filePath, Buffer.from(buffer)) // Save the file to disk
          .then(() => {
            console.log(`/uploads/${path.basename(filePath)}`);

            resolve(json({ url: `/uploads/${path.basename(filePath)}` }));
          })
          .catch((err) => {
            console.log("Error saving file", err);
            reject(json({ error: "Failed to save file" }, { status: 500 }));
          });
      }
    });
  });
};
