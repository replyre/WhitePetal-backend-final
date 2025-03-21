import { Response } from "express";
import { AuthRequest } from "../lib/Utils/Middleware";
import cloudinary from "../lib/Utils/Cloundinary";
import Gallery from "../models/Gallery";
import fs from "fs";

/**
 * Upload Image (Now accepts image URL)
 */
// export const uploadImage = (req: AuthRequest, res: Response): void => {
//   const { imageUrl, title, schoolName } = req.body;

//   if (!imageUrl || !title || !schoolName) {
//     res
//       .status(400)
//       .json({ message: "Image URL, title, and school name are required." });
//   }

//   if (!req.user || !req.user.id) {
//     res.status(403).json({ message: "Unauthorized: User must be logged in." });
//   }

//   Gallery.create({
//     imageUrl,
//     title,
//     schoolName,
//     uploadedBy: req.user!.id,
//   })
//     .then((image) =>
//       res.status(201).json({ message: "Image uploaded successfully.", image })
//     )
//     .catch((err) =>
//       res.status(500).json({ message: "Upload failed.", error: err })
//     );
// };

export const uploadImage = (req: AuthRequest, res: Response) => {
  if (!req.file || !req.body.title || !req.body.schoolName) {
    res
      .status(400)
      .json({ message: "file, title, and schoolName are required" });
    return;
  }

  if (!req.user || !req.user._id) {
    res.status(403).json({ message: "Unauthorized: User must be logged in" });
    return;
  }

  cloudinary.uploader
    .upload(req.file.path)
    .then((result) => {
      fs.unlinkSync(req.file!.path);
      return Gallery.create({
        imageUrl: result.secure_url,
        title: req.body.title,
        schoolName: req.body.schoolName,
        uploadedBy: req.user!.id || req.user?._id, // ✅ FIX: `req.user!._id` since we've checked `req.user` exists
      });
    })
    .then((image) => res.status(201).json({ message: "Image uploaded", image }))
    .catch((err) =>
      res.status(500).json({ message: "Upload failed", error: err })
    );
};

/**
 * Approve Image - Admin only
 */
export const approveImage = (req: AuthRequest, res: Response): void => {
  if (!req.user || req.user.role !== "admin") {
    res
      .status(403)
      .json({ message: "Unauthorized: Only admins can approve images." });
  }

  Gallery.findByIdAndUpdate(req.params.id, { approved: true }, { new: true })
    .then((image) => {
      if (!image) return res.status(404).json({ message: "Image not found." });
      res.json({ message: "Image approved.", image });
    })
    .catch((err) =>
      res.status(500).json({ message: "Approval failed.", error: err })
    );
};

/**
 * Reject Image - Admin only
 */
export const rejectImage = (req: AuthRequest, res: Response): void => {
  if (!req.user || req.user.role !== "admin") {
    res
      .status(403)
      .json({ message: "Unauthorized: Only admins can reject images." });
    return;
  }

  Gallery.findByIdAndUpdate(req.params.id, { approved: false }, { new: true })
    .then((image) => {
      if (!image) return res.status(404).json({ message: "Image not found." });
      res.json({ message: "Image rejected.", image });
    })
    .catch((err) =>
      res.status(500).json({ message: "Rejection failed.", error: err })
    );
};

/**
 * Get Gallery - Public access
 */
export const getGallery = (req: AuthRequest, res: Response): void => {
  const sortBy = req.query.sortBy === "newest" ? "-createdAt" : "createdAt";

  Gallery.find({ approved: true })
    .sort(sortBy)
    .populate("uploadedBy", "name email")
    .then((images) => res.json({ images }))
    .catch((err) =>
      res.status(500).json({ message: "Error fetching images.", error: err })
    );
};
/*** Update Image - Requires authentication */
export const updateImage = (req: AuthRequest, res: Response): void => {
  const { imageUrl, title, schoolName } = req.body;

  if (!imageUrl && !title && !schoolName) {
    res.status(400).json({ message: "No data provided for update." });
  }

  Gallery.findByIdAndUpdate(
    req.params.id,
    { imageUrl, title, schoolName },
    { new: true }
  )
    .then((updatedImage) => {
      if (!updatedImage)
        return res.status(404).json({ message: "Image not found." });
      res.json({ message: "Image updated successfully.", image: updatedImage });
    })
    .catch((err) =>
      res.status(500).json({ message: "Update failed.", error: err })
    );
};

/**
 * Delete Image - Requires authentication
 */
export const deleteImage = (req: AuthRequest, res: Response) => {
  Gallery.findByIdAndDelete(req.params.id)
    .then((image) => {
      if (!image) return res.status(404).json({ message: "Image not found." });
      res.json({ message: "Image deleted successfully." });
    })
    .catch((err) =>
      res.status(500).json({ message: "Delete failed.", error: err })
    );
};

export const getPendingImages = (req: AuthRequest, res: Response): void => {
  const sortBy = req.query.sortBy === "newest" ? "-createdAt" : "createdAt";

  Gallery.find({ approved: false })
    .sort(sortBy)
    .populate("uploadedBy", "name email")
    .then((images) => res.json({ images }))
    .catch((err) =>
      res
        .status(500)
        .json({ message: "Error fetching pending images images.", error: err })
    );
};
