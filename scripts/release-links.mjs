const repository='https://github.com/noahsong-sdg/mass-spinner/blob/';

/** @param {string} revision */
export function releaseSourceBase(revision){
 if(!/^[0-9a-f]{40}$/.test(revision))throw new Error('Published source links need an exact Git revision.');
 return `${repository}${revision}/`;
}

/** Only the help page's moving implementation links; retain pinned historical citations. */
/** @param {string} html @param {string} revision */
export function pinReleaseLinks(html,revision){
 return html.replaceAll(`${repository}main/`,releaseSourceBase(revision));
}
