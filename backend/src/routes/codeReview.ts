import { Router } from "express"
import { logger } from "../utils/logger"
import { validateCodeReviewRequest } from "../middleware/validation"
import { codeReviewController } from "../controllers/codeReviewController"
import { requireJWT, requireGitHubToken } from "../middleware/auth"

const router = Router()

// POST /api/code-review/analyze - Analyze code for review
router.post("/analyze", validateCodeReviewRequest, codeReviewController.analyzeCode)

// GET /api/code-review/reviews - Get all reviews (with pagination)
router.get("/reviews", codeReviewController.getReviews)

// GET /api/code-review/reviews/:id - Get specific review
router.get("/reviews/:id", codeReviewController.getReviewById)

// POST /api/code-review/reviews - Create a new review
router.post("/reviews", validateCodeReviewRequest, codeReviewController.createReview)

// PUT /api/code-review/reviews/:id - Update a review
router.put("/reviews/:id", validateCodeReviewRequest, codeReviewController.updateReview)

// DELETE /api/code-review/reviews/:id - Delete a review
router.delete("/reviews/:id", codeReviewController.deleteReview)

// POST /api/code-review/batch - Analyze multiple files at once
router.post("/batch", codeReviewController.batchAnalyze)

// GET /api/code-review/stats - Get review statistics
router.get("/stats", codeReviewController.getStats)

// POST /api/code-review/start/:owner/:repo/:prNumber - Start a PR code review (streams via SSE)
router.post("/start/:owner/:repo/:prNumber", requireJWT, requireGitHubToken, codeReviewController.startPrReview)

// GET /api/code-review/result/:taskId - Get final aggregated result
router.get("/result/:taskId", codeReviewController.getReviewResult)

export default router
