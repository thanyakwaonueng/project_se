// backend/utils/artistVisibility.js
function filterArtistForRole(role, artist, { isOwner = false } = {}) {
  if (!artist) return artist;

  // ฟิลด์สาธารณะ
  const base = {
    id: artist.id,
    userId: artist.userId,
    name: artist.name,
    description: artist.description,
    genre: artist.genre,
    subGenre: artist.subGenre,
    foundingYear: artist.foundingYear,
    label: artist.label,
    isIndependent: artist.isIndependent,
    memberCount: artist.memberCount,
    photoUrl: artist.photoUrl,
    profilePhotoUrl: artist.profilePhotoUrl,
    videoUrl: artist.videoUrl,
    spotifyUrl: artist.spotifyUrl,
    youtubeUrl: artist.youtubeUrl,
    appleMusicUrl: artist.appleMusicUrl,
    facebookUrl: artist.facebookUrl,
    instagramUrl: artist.instagramUrl,
    soundcloudUrl: artist.soundcloudUrl,
    shazamUrl: artist.shazamUrl,
    bandcampUrl: artist.bandcampUrl,
    tiktokUrl: artist.tiktokUrl,
    createdAt: artist.createdAt,
    updatedAt: artist.updatedAt,
  };

  const canSeePrivate = role === 'ADMIN' || role === 'ORGANIZE' || isOwner;

  if (!canSeePrivate) return base;

  // ฟิลด์ส่วนตัว/สำหรับงานจ้าง
  return {
    ...base,
    bookingType: artist.bookingType,
    priceMin: artist.priceMin,
    priceMax: artist.priceMax,
    contactEmail: artist.contactEmail,
    contactPhone: artist.contactPhone,
    rateCardUrl: artist.rateCardUrl,
    epkUrl: artist.epkUrl,
    riderUrl: artist.riderUrl,
  };
}

module.exports = { filterArtistForRole };
