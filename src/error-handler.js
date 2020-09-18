
export class ErrorHandler{
  handle = (error) => {
    error !== null && console.error('Error:', error);
  }
};
