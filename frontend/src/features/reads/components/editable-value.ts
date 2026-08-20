// The look of a header value that opens an editor in place: dotted underline at rest,
// solid on hover. It sits in its own module because both inline editors wear it, and an
// affordance that means "click me" is only useful while every value wearing it agrees.
export const EDITABLE_VALUE_CLASS =
  'h-auto p-0 font-normal text-inherit underline decoration-dotted underline-offset-4 hover:decoration-solid';
