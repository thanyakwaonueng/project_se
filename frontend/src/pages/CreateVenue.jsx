import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function CreateVenue() {
  const [name, setName] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [dateOpen, setDateOpen] = useState('');
  const [dateClose, setDateClose] = useState('');
  const [priceRate, setPriceRate] = useState('BUDGET');
  const [timeOpen, setTimeOpen] = useState('');
  const [timeClose, setTimeClose] = useState('');
  const [alcoholPolicy, setAlcoholPolicy] = useState('SERVE');
  const [ageRestriction, setAgeRestriction] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [lineUrl, setLineUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const navigate = useNavigate();

  // Fetch current user profile info
  useEffect(() => {
    axios.get('/me', { withCredentials: true })
      .then(res => {
        const profile = res.data.venueProfile;
        if (profile) {
          setHasProfile(true);
          setName(profile.name || '');
          setLocationUrl(profile.locationUrl || '');
          setGenre(profile.genre || '');
          setDescription(profile.description || '');
          setCapacity(profile.capacity || '');
          setDateOpen(profile.dateOpen ? profile.dateOpen.slice(0, 10) : '');
          setDateClose(profile.dateClose ? profile.dateClose.slice(0, 10) : '');
          setPriceRate(profile.priceRate || '');
          setTimeOpen(profile.timeOpen || '');
          setTimeClose(profile.timeClose || '');
          setAlcoholPolicy(profile.alcoholPolicy || 'SERVE');
          setAgeRestriction(profile.ageRestriction || '');
          setProfilePhotoUrl(profile.profilePhotoUrl || '');
          setPhotoUrls((profile.photoUrls || []).join(', '));
          setContactEmail(profile.contactEmail || '');
          setContactPhone(profile.contactPhone || '');
          setFacebookUrl(profile.facebookUrl || '');
          setInstagramUrl(profile.instagramUrl || '');
          setLineUrl(profile.lineUrl || '');
          setTiktokUrl(profile.tiktokUrl || '');
          setWebsiteUrl(profile.websiteUrl || '');
        }
      })
      .catch(err => {
        console.error('Failed to fetch /me:', err);
      });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const raw = {
        name: name.trim(),
        locationUrl: locationUrl.trim(),
        genre: genre.trim(),
        description: description.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        dateOpen: dateOpen ? new Date(dateOpen).toISOString() : undefined,
        dateClose: dateClose ? new Date(dateClose).toISOString() : undefined,
        priceRate: priceRate.trim() || undefined,
        timeOpen: timeOpen.trim() || undefined,
        timeClose: timeClose.trim() || undefined,
        alcoholPolicy,
        ageRestriction: ageRestriction.trim() || undefined,
        profilePhotoUrl: profilePhotoUrl.trim() || undefined,
        photoUrls: photoUrls ? photoUrls.split(',').map(s => s.trim()).filter(Boolean) : [],
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        facebookUrl: facebookUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        lineUrl: lineUrl.trim() || undefined,
        tiktokUrl: tiktokUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
      };

      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) =>
          v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
        )
      );

      const res = await axios.post('/venues', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      setLoading(false);
      navigate(`/venues/${res.data.id}`);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'Failed to save venue');
      console.error('CreateVenue error:', err);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 700 }}>
      <h2>{hasProfile ? 'Edit Venue Profile' : 'Create Venue Profile'}</h2>

      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

      <label>
        Name *
        <input value={name} onChange={e => setName(e.target.value)} required />
      </label>
      <br />

      <label>
        Location URL *
        <input value={locationUrl} onChange={e => setLocationUrl(e.target.value)} required />
      </label>
      <br />

      <label>
        Genre *
        <input value={genre} onChange={e => setGenre(e.target.value)} required />
      </label>
      <br />

      <label>
        Description
        <textarea value={description} onChange={e => setDescription(e.target.value)} />
      </label>
      <br />

      <label>
        Capacity
        <input value={capacity} onChange={e => setCapacity(e.target.value.replace(/\D/g, ''))} />
      </label>
      <br />

      <label>
        Date Open
        <input type="date" value={dateOpen} onChange={e => setDateOpen(e.target.value)} />
      </label>
      <br />

      <label>
        Date Close
        <input type="date" value={dateClose} onChange={e => setDateClose(e.target.value)} />
      </label>
      <br />

      <label>
        Price Rate *
        <select value={priceRate} onChange={e => setPriceRate(e.target.value)} required>
          <option value="BUDGET">BUDGET</option>
          <option value="STANDARD">STANDARD</option>
          <option value="PREMIUM">PREMIUM</option>
          <option value="VIP">VIP</option>
          <option value="LUXURY">LUXURY</option>
        </select>
      </label>
      <br />

      <label>
        Time Open
        <input type="time" value={timeOpen} onChange={e => setTimeOpen(e.target.value)} />
      </label>
      <br />

      <label>
        Time Close
        <input type="time" value={timeClose} onChange={e => setTimeClose(e.target.value)} />
      </label>
      <br />

      <label>
        Alcohol Policy *
        <select value={alcoholPolicy} onChange={e => setAlcoholPolicy(e.target.value)} required>
          <option value="SERVE">SERVE</option>
          <option value="NONE">NONE</option>
          <option value="BYOB">BYOB</option>
        </select>
      </label>
      <br />

      <label>
        Age Restriction
        <input value={ageRestriction} onChange={e => setAgeRestriction(e.target.value)} />
      </label>
      <br />

      <label>
        Profile Photo URL
        <input value={profilePhotoUrl} onChange={e => setProfilePhotoUrl(e.target.value)} />
      </label>
      <br />

      <label>
        Photo URLs (comma separated)
        <input value={photoUrls} onChange={e => setPhotoUrls(e.target.value)} />
      </label>
      <br />

      <label>
        Contact Email
        <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
      </label>
      <br />

      <label>
        Contact Phone
        <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
      </label>
      <br />

      <label>
        Facebook URL
        <input value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} />
      </label>
      <br />

      <label>
        Instagram URL
        <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />
      </label>
      <br />

      <label>
        LINE URL
        <input value={lineUrl} onChange={e => setLineUrl(e.target.value)} />
      </label>
      <br />

      <label>
        TikTok URL
        <input value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)} />
      </label>
      <br />

      <label>
        Website URL
        <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
      </label>
      <br />

      <button type="submit" disabled={loading}>
        {loading
          ? (hasProfile ? 'Updating…' : 'Creating…')
          : (hasProfile ? 'Update Venue' : 'Create Venue')}
      </button>
    </form>
  );
}

