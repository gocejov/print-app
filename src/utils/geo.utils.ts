import geoip from 'geoip-lite';

export const isIPClose = (previousIP: string | number, currentIP: string | number) => {
  const prevGeo = geoip.lookup(previousIP);
  const currGeo = geoip.lookup(currentIP);

  if (prevGeo && currGeo) {
    // Check if IPs are from the same region or country
    return prevGeo.country === currGeo.country;
  }

  return false;
};
