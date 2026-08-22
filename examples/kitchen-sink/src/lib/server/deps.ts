import clsx from 'clsx';
import { dequal } from 'dequal';

export const prodMarker = dequal({ n: 1 }, { n: 1 }) ? 'dequal-external' : 'dequal-fail';
export const devMarker = clsx('inlined-dev-helper');
