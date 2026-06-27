-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "faviconPath" TEXT NOT NULL DEFAULT '',
    "logoLightPath" TEXT NOT NULL DEFAULT '',
    "logoDarkPath" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
