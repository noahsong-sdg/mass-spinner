/** A supported reference must have strictly more radial intervals. A null
 * result means radial convergence is unassessed at the solver's existing cap.
 */
export function radialRefinementSettings<T extends {bins:number}>(settings:T):T|null {
 const bins=Math.min(2000,settings.bins*2);
 return bins>settings.bins?{...settings,bins}:null;
}
