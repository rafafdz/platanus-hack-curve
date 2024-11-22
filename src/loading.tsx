import bananaDance from "./assets/banana-dance.gif";

export function Loading() {
  return (
    <div className="flex justify-center items-center h-full images-are-pixelated">
      <img src={bananaDance} alt="loading" />
    </div>
  );
}
