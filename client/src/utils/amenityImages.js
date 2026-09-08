import { projectService } from '../services';

export async function uploadPendingAmenityImages(projectUuid, pendingImages = {}) {
  const entries = Object.entries(pendingImages).filter(([, file]) => file);
  let lastProject = null;

  for (const [amenityId, file] of entries) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await projectService.uploadAmenityImage(projectUuid, amenityId, fd);
    lastProject = data.data;
  }

  return lastProject;
}
