import { GoogleMapView } from "@/components/maps/GoogleMapView";
import { STORE_LOCATION } from "@/lib/constants";

export function StoreMap() {
  return (
    <GoogleMapView
      center={STORE_LOCATION}
      zoom={15}
      markers={[{ lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng, title: "Auto Galaxy" }]}
    />
  );
}
