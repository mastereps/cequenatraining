import { useState } from "react";
import { BsHeart, BsFillHeartFill } from "react-icons/bs";

interface Props {
  handleClick: () => void;
}

const Like = ({ handleClick }: Props) => {
  const [liked, setLiked] = useState(false);
  const Icon = liked ? BsFillHeartFill : BsHeart;
  return (
    <Icon
      color="deeppink"
      size={40}
      onClick={() => {
        handleClick();
        setLiked(!liked);
      }}
      className="cursor-pointer"
    />
  );
};

export default Like;
