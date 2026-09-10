import brandIcon from '../assets/w_icon.png';
import brandLogo from '../assets/w_logo.png';
import { APP_NAME } from '../constants';

export { brandIcon, brandLogo };

export function BrandIcon({ className = '', alt = APP_NAME }) {
  return (
    <img
      src={brandIcon}
      alt={alt}
      className={`brand-icon ${className}`.trim()}
      width={34}
      height={34}
      decoding="async"
    />
  );
}

export function BrandLogo({ className = '', alt = APP_NAME }) {
  return (
    <img
      src={brandLogo}
      alt={alt}
      className={`brand-logo ${className}`.trim()}
      decoding="async"
    />
  );
}
