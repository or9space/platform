/** Comment target surfaces — mirrors the Prisma CommentEntity enum without
 *  importing @prisma/client into app code (lint rule or9/no-untenanted-query). */
export type CommentEntity = "EVENT" | "NEWS" | "GALLERY" | "OPERATION";
